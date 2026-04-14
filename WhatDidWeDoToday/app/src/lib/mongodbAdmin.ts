/**
 * MongoDB Atlas 연결 설정
 * 서버 사이드에서 사용하는 MongoDB 클라이언트
 */
import { MongoClient, Db } from "mongodb";

// 서버리스 환경을 위한 연결 관리
let clientPromise: Promise<MongoClient> | null = null;

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "whatdidwedotoday";

if (!MONGODB_URI) {
  console.warn("MONGODB_URI 환경 변수가 설정되지 않았습니다.");
}

function getMongoClient(): Promise<MongoClient> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI 환경 변수가 필요합니다.");
  }

  // 서버리스 환경에서 연결 재사용 (Vercel 최적화)
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        // MongoDB Atlas는 기본적으로 SSL을 사용하므로, 연결 문자열에 tls 파라미터가 있으면 제거
        // 드라이버 옵션에서 명시적으로 설정하지 않으면 기본 SSL 설정 사용
        const client = new MongoClient(MONGODB_URI, {
          maxPoolSize: 1, // 서버리스에서는 1로 제한
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 15000,
          // 서버리스 환경 최적화
          retryWrites: true,
          retryReads: true,
          // TLS는 MongoDB Atlas가 자동으로 처리하므로 명시적 설정 제거
        });
        await client.connect();
        console.log("MongoDB 연결 성공");
        return client;
      } catch (error: any) {
        console.error("MongoDB 연결 실패:", {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          code: error?.code,
        });
        clientPromise = null; // 실패 시 재시도 가능하도록
        throw error;
      }
    })();
  }

  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(MONGODB_DB_NAME);
}

// MongoDB 컬렉션 래퍼 (Firebase와 유사한 API 제공)
export class MongoCollection {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  doc(id?: string) {
    return new MongoDocRef(this.collectionName, id);
  }

  async get(id?: string): Promise<any> {
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);

    if (id) {
      // @ts-ignore - MongoDB는 문자열 _id를 지원함
      const doc = await collection.findOne({ _id: id });
      if (!doc) {
        return { exists: false, data: () => null, id: null };
      }
      const { _id, ...data } = doc;
      return {
        exists: true,
        data: () => data,
        id: String(_id),
      };
    }

    // 전체 조회
    const docs = await collection.find({}).toArray();
    return {
      docs: docs.map((doc) => {
        const { _id, ...data } = doc;
        return {
          id: String(_id),
          data: () => data,
          exists: true,
        };
      }),
    } as { docs: Array<{ id: string; data: () => any; exists: boolean }> };
  }

  async add(data: any) {
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);
    // UUID를 _id로 사용 (Firebase와 호환)
    const { v4: uuidv4 } = await import("uuid");
    const id = uuidv4();
    await collection.insertOne({ ...data, _id: id });
    return new MongoDocRef(this.collectionName, id);
  }

  async update(id: string, data: any) {
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);
    await collection.updateOne(
      { _id: id as any },
      { $set: data },
      { upsert: false }
    );
  }

  async delete(id: string) {
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);
    await collection.deleteOne({ _id: id as any });
  }

  orderBy(field: string, direction: "asc" | "desc" = "desc"): MongoQuery {
    return new MongoQuery(this.collectionName, { sort: { [field]: direction === "desc" ? -1 : 1 } });
  }

  where(field: string, operator: string, value: any): MongoQuery {
    return new MongoQuery(this.collectionName, { filter: { [field]: this._convertOperator(operator, value) } });
  }

  limit(count: number): MongoQuery {
    return new MongoQuery(this.collectionName, { limit: count });
  }

  _convertOperator(operator: string, value: any): any {
    switch (operator) {
      case ">=":
        return { $gte: value };
      case "<=":
        return { $lte: value };
      case ">":
        return { $gt: value };
      case "<":
        return { $lt: value };
      case "==":
      case "=":
        return value;
      default:
        return value;
    }
  }
}

// MongoDB 쿼리 빌더 (Firebase와 유사한 API)
class MongoQuery {
  private collectionName: string;
  private options: {
    sort?: Record<string, number>;
    filter?: Record<string, any>;
    limit?: number;
  };

  constructor(collectionName: string, options: any = {}) {
    this.collectionName = collectionName;
    this.options = options;
  }

  orderBy(field: string, direction: "asc" | "desc" = "desc") {
    this.options.sort = { [field]: direction === "desc" ? -1 : 1 };
    return this;
  }

  where(field: string, operator: string, value: any) {
    if (!this.options.filter) {
      this.options.filter = {};
    }
    this.options.filter[field] = this._convertOperator(operator, value);
    return this;
  }

  limit(count: number) {
    this.options.limit = count;
    return this;
  }

  async get() {
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);

    let query: any = {};
    if (this.options.filter) {
      query = { ...this.options.filter };
    }

    let cursor = collection.find(query);

    if (this.options.sort) {
      cursor = cursor.sort(this.options.sort as any);
    }

    if (this.options.limit) {
      cursor = cursor.limit(this.options.limit);
    }

    const docs = await cursor.toArray();
    return {
      docs: docs.map((doc) => {
        const { _id, ...data } = doc;
        return {
          id: String(_id),
          data: () => data,
          exists: true,
        };
      }),
    };
  }

  _convertOperator(operator: string, value: any): any {
    switch (operator) {
      case ">=":
        return { $gte: value };
      case "<=":
        return { $lte: value };
      case ">":
        return { $gt: value };
      case "<":
        return { $lt: value };
      case "==":
      case "=":
        return value;
      default:
        return value;
    }
  }
}

// MongoDB 문서 참조 (Firebase doc() 호환)
class MongoDocRef {
  private collectionName: string;
  private id: string | undefined;

  constructor(collectionName: string, id?: string) {
    this.collectionName = collectionName;
    this.id = id;
  }

  async get() {
    if (!this.id) {
      return { exists: false, data: () => null, id: null };
    }
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);
    // @ts-ignore - MongoDB는 문자열 _id를 지원함
    const doc = await collection.findOne({ _id: this.id });
    if (!doc) {
      return { exists: false, data: () => null, id: null };
    }
    const { _id, ...data } = doc;
    return {
      exists: true,
      data: () => data,
      id: String(_id),
    };
  }

  async set(data: any, options?: { merge?: boolean }) {
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);
    
    if (!this.id) {
      // 새 문서 생성
      const { v4: uuidv4 } = await import("uuid");
      this.id = uuidv4();
    }

    if (options?.merge) {
      // 병합 업데이트
      await collection.updateOne(
        { _id: this.id as any },
        { $set: data },
        { upsert: true }
      );
    } else {
      // 전체 교체
      await collection.replaceOne(
        { _id: this.id as any },
        { ...data, _id: this.id },
        { upsert: true }
      );
    }
  }

  async update(data: any) {
    if (!this.id) {
      throw new Error("문서 ID가 필요합니다.");
    }
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);
    await collection.updateOne(
      { _id: this.id as any },
      { $set: data },
      { upsert: false }
    );
  }

  async delete() {
    if (!this.id) {
      throw new Error("문서 ID가 필요합니다.");
    }
    const db = await getMongoDb();
    const collection = db.collection(this.collectionName);
    await collection.deleteOne({ _id: this.id as any });
  }
}

// MongoDB 배치 작업 (Firebase batch 호환)
export class MongoBatch {
  private operations: Array<{ type: string; ref: MongoDocRef; data?: any }> = [];

  set(ref: MongoDocRef, data: any) {
    this.operations.push({ type: "set", ref, data });
  }

  update(ref: MongoDocRef, data: any) {
    this.operations.push({ type: "update", ref, data });
  }

  async commit() {
    for (const op of this.operations) {
      if (op.type === "set" && op.ref && op.data) {
        await op.ref.set(op.data, { merge: true });
      } else if (op.type === "update" && op.ref && op.data) {
        await op.ref.update(op.data);
      }
    }
  }
}

// Firebase와 유사한 API 제공
export const mongoDb = {
  collection: (name: string) => new MongoCollection(name),
  batch: () => new MongoBatch(),
};

// Firebase 호환성을 위한 래퍼
export const adminDb = mongoDb;
