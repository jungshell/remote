import streamlit as st
import streamlit_authenticator as stauth
import yaml
from yaml.loader import SafeLoader
import os
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
from streamlit_lottie import st_lottie
import requests
import random
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.generativeai as genai
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.chains.question_answering import load_qa_chain
import gspread
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
import json
import olefile
import zlib
import struct

# --- Page Configuration ---
st.set_page_config(page_title="충남콘텐츠진흥원 업무 플랫폼", page_icon="🏢", layout="wide")

# --- Custom CSS for Enterprise Design ---
st.markdown("""
<style>
    /* Global Font & Animation */
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Noto Sans KR', sans-serif;
        color: #E0E0E0; /* Light gray text for dark mode compatibility */
    }

    /* Padding Alignment */
    .block-container {
        padding-top: 2rem !important; /* Unified top padding */
        padding-bottom: 5rem;
    }
    
    /* Remove default header background */
    .stAppHeader {
        background-color: transparent !important;
    }

    /* Slide-up Animation */
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .slide-up {
        animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Glassmorphism Card Style - Advanced Frosted Glass */
    .glass-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 24px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    /* Hover Effect for Cards */
    .glass-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(79, 70, 229, 0.4); /* Neon Blue Border on Hover */
    }

    /* Metric Styling - Modern */
    div[data-testid="stMetric"] {
        background-color: rgba(255, 255, 255, 0.03);
        border-radius: 16px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;
        backdrop-filter: blur(8px);
    }
    
    div[data-testid="stMetric"]:hover {
        transform: scale(1.02);
        box-shadow: 0 5px 15px rgba(79, 70, 229, 0.2); /* Neon Blue Glow */
        border: 1px solid rgba(79, 70, 229, 0.3);
    }
    
    /* Metric Label Color */
    div[data-testid="stMetricLabel"] {
        color: #9CA3AF !important;
    }
    
    /* Metric Value Color */
    div[data-testid="stMetricValue"] {
        color: #F3F4F6 !important;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #0F172A; /* Slate 900 */
        border-right: 1px solid rgba(255,255,255,0.05);
    }
    
    /* Button Styling */
    .stButton>button {
        border-radius: 12px;
        font-weight: 600;
        transition: all 0.2s;
        border: none;
        padding: 0.5rem 1rem;
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    ::-webkit-scrollbar-track {
        background: #1e293b; 
    }
    ::-webkit-scrollbar-thumb {
        background: #475569; 
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #64748b; 
    }
    
    /* Table Styling */
    thead tr th {
        background-color: rgba(255, 255, 255, 0.05) !important;
        color: #60A5FA !important;
    }

</style>
""", unsafe_allow_html=True)

# --- Configuration File Management ---
CONFIG_FILE = 'config.yaml'

def create_default_config():
    """Generates a default config.yaml with pre-defined users."""
    users = [
        {"username": "1111", "name": "정성인", "password": "1111", "role": "admin", "email": "admin@example.com"},
        {"username": "2222", "name": "강병우", "password": "2222", "role": "manager", "email": "manager@example.com"},
        {"username": "9999", "name": "일반", "password": "9999", "role": "user", "email": "user@example.com"}
    ]

    hashed_credentials = {"usernames": {}}
    passwords_to_hash = [user["password"] for user in users]
    hashed_passwords = stauth.Hasher.hash_list(passwords_to_hash)

    for idx, user in enumerate(users):
        hashed_credentials["usernames"][user["username"]] = {
            "name": user["name"],
            "password": hashed_passwords[idx],
            "roles": [user["role"]],
            "email": user["email"]
        }

    config = {
        "credentials": hashed_credentials,
        "cookie": {
            "expiry_days": 1,
            "key": "chungnam_content_agency_secret_key",
            "name": "cca_auth_cookie"
        },
        "pre-authorized": {"emails": []}
    }

    with open(CONFIG_FILE, 'w') as file:
        yaml.dump(config, file, default_flow_style=False)

if not os.path.exists(CONFIG_FILE):
    create_default_config()

with open(CONFIG_FILE) as file:
    config = yaml.load(file, Loader=SafeLoader)

# --- Authentication Setup ---
authenticator = stauth.Authenticate(
    config['credentials'],
    config['cookie']['name'],
    config['cookie']['key'],
    config['cookie']['expiry_days']
)

# --- Helper Functions ---
@st.cache_data
def load_lottieurl(url: str):
    try:
        r = requests.get(url)
        if r.status_code != 200:
            return None
        return r.json()
    except:
        return None

def calculate_age(birthdate):
    if isinstance(birthdate, str):
        try:
            birthdate = datetime.strptime(birthdate, "%Y-%m-%d")
        except:
            return 0
    today = datetime.today()
    return today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))

def generate_sample_data():
    base_data = {
        "이름": ["김철수", "이영희", "박민수", "최지우", "정수민", "강호동", "유재석", "박명수", "정준하", "노홍철"],
        "부서": ["기획팀", "인사팀", "개발팀", "기획팀", "인사팀", "개발팀", "영업팀", "영업팀", "경영지원", "경영지원"],
        "직급": ["사원", "대리", "과장", "차장", "부장", "사원", "대리", "과장", "차장", "부장"],
        "생년월일": ["1995-05-12", "1990-08-23", "1985-03-15", "1980-12-01", "1975-07-07",
                 "1998-01-20", "1992-11-11", "1988-06-30", "1982-04-05", "1979-09-09"],
        "성별": ["남", "여", "남", "여", "여", "남", "남", "남", "남", "남"]
    }
    
    # Generate data for multiple years for animation
    years = [2022, 2023, 2024]
    all_data = []
    
    # Base join dates for consistency (demo purpose)
    join_dates = [
        "2020-03-01", "2019-05-15", "2015-01-10", "2010-11-20", "2005-04-01",
        "2023-01-02", "2018-08-14", "2014-06-01", "2009-12-12", "2008-02-28"
    ]

    for year in years:
        df = pd.DataFrame(base_data)
        df["연도"] = year
        df["입사일"] = join_dates
        # Random leave data
        df["총연차"] = [15 + (year - int(d[:4]))//2 for d in join_dates] # Increase with tenure
        df["사용연차"] = [random.randint(0, 15) for _ in range(10)]
        
        # Slightly randomize counts by dropping random rows for past years
        if year < 2024:
            drop_indices = random.sample(range(len(df)), k=random.randint(1, 3))
            df = df.drop(drop_indices)
        all_data.append(df)
        
    return pd.concat(all_data, ignore_index=True)

def calculate_tenure(join_date_str):
    if not isinstance(join_date_str, str):
        join_date_str = str(join_date_str)
    
    # Remove any non-digit characters
    join_date_str = ''.join(filter(str.isdigit, join_date_str))
    
    if len(join_date_str) == 8:
        try:
            join_date = datetime.strptime(join_date_str, "%Y%m%d")
            today = datetime.today()
            return today.year - join_date.year - ((today.month, today.day) < (join_date.month, join_date.day))
        except ValueError:
            return None # Or some other default value
    return None # Or handle other formats if needed

def calculate_age(birth_date_str):
    if not isinstance(birth_date_str, str):
        birth_date_str = str(birth_date_str)
    
    birth_date_str = ''.join(filter(str.isdigit, birth_date_str))
    
    if len(birth_date_str) == 8:
        try:
            birth_date = datetime.strptime(birth_date_str, "%Y%m%d")
            today = datetime.today()
            return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        except ValueError:
            return None
    return None

def predict_retirement(df, retirement_age=61):
    """정년퇴직 예측"""
    today = datetime.today()
    retirement_list = []
    
    for _, row in df.iterrows():
        birth_date_str = ''.join(filter(str.isdigit, str(row.get('생년월일', ''))))
        if len(birth_date_str) == 8:
            birth_year = int(birth_date_str[:4])
            retirement_year = birth_year + retirement_age
            
            # 근무 중인 사람만 대상 (퇴사일이 없거나 미래인 경우)
            if retirement_year >= today.year:
                retirement_list.append({
                    '이름': row['이름'],
                    '부서': row['부서'],
                    '직급': row['직급'],
                    '생년월일': row['생년월일'],
                    '정년퇴직예상년도': retirement_year,
                    '예상퇴사사유': '정년퇴직',
                    '잔여근무년수': retirement_year - today.year
                })
    
    return pd.DataFrame(retirement_list)

def predict_contract_end(df):
    """계약만료 예측"""
    today = datetime.today()
    contract_end_list = []
    
    for _, row in df.iterrows():
        if row.get('고용형태') == '계약직':
            contract_end_str = ''.join(filter(str.isdigit, str(row.get('계약종료일', ''))))
            if len(contract_end_str) == 8:
                contract_end = datetime.strptime(contract_end_str, "%Y%m%d")
                
                if contract_end >= today:  # 아직 만료되지 않은 계약만
                    days_until_end = (contract_end - today).days
                    
                    contract_end_list.append({
                        '이름': row['이름'],
                        '부서': row['부서'],
                        '직급': row['직급'],
                        '계약종료일': row['계약종료일'],
                        '예상퇴사사유': '계약만료',
                        '잔여계약일수': days_until_end,
                        '잔여계약개월수': round(days_until_end / 30, 1)
                    })
    
    return pd.DataFrame(contract_end_list)

def simulate_workforce_supply_demand(df, target_months=[6, 12]):
    """인력수급 시뮬레이션"""
    today = datetime.today()
    simulation_results = []
    
    for months in target_months:
        future_date = today + timedelta(days=months*30)
        
        # 정년퇴직자 수
        retirement_df = predict_retirement(df)
        retirement_count = len(retirement_df[retirement_df['정년퇴직예상년도'] <= future_date.year])
        
        # 계약만료자 수
        contract_df = predict_contract_end(df)
        contract_count = len(contract_df[contract_df['잔여계약개월수'] <= months])
        
        # 총 예상 퇴사자
        total_expected_leave = retirement_count + contract_count
        
        # 현재 인원 수 (근무 중인 사람만)
        current_active = len(df)  # 간단히 전체 인원으로 계산 (실제로는 퇴사자 제외 필요)
        
        simulation_results.append({
            '시점': f'{months}개월 후',
            '예상날짜': future_date.strftime('%Y-%m'),
            '정년퇴직예상인원': retirement_count,
            '계약만료예상인원': contract_count,
            '총예상퇴사인원': total_expected_leave,
            '현재인원': current_active,
            '예상순인원': current_active - total_expected_leave,
            '인력공급필요여부': '필요' if total_expected_leave > 0 else '양호'
        })
    
    return pd.DataFrame(simulation_results)

def calculate_allowance(tenure):
    base = 200000
    return base + (tenure * 50000)

def generate_sample_asset_data():
    data = {
        "관리번호": [f"AST-{i:04d}" for i in range(1, 11)],
        "품목": ["노트북", "모니터", "노트북", "데스크탑", "의자", "프린터", "태블릿", "모니터", "노트북", "책상"],
        "모델명": ["Galaxy Book 3", "LG UltraFine", "MacBook Pro", "Dell OptiPlex", "Sidiz T50", "Canon LBP", "iPad Air", "Samsung Odyssey", "LG Gram", "Fursys"],
        "사용자": ["정성인", "강병우", "일반", "", "정성인", "공용", "강병우", "", "신규입사자", "일반"],
        "상태": ["사용중", "사용중", "사용중", "재고", "사용중", "사용중", "사용중", "수리중", "지급대기", "사용중"],
        "구입일": ["2023-01-10", "2022-05-20", "2023-11-01", "2021-08-15", "2023-02-28", "2020-12-10", "2023-06-15", "2021-03-22", "2024-01-05", "2022-09-09"]
    }
    return pd.DataFrame(data)

def generate_sample_contract_data():
    today = datetime.now()
    data = {
        "계약명": ["사무기기 유지보수", "소프트웨어 라이선스", "청소 용역", "차량 리스", "행사 대행"],
        "업체명": ["A테크", "B소프트", "C클린", "D렌터카", "E에이전시"],
        "시작일": ["2023-01-01", "2023-06-01", "2024-01-01", "2022-03-15", "2024-02-01"],
        "종료일": [
            (today + timedelta(days=5)).strftime("%Y-%m-%d"),  # Critical
            (today + timedelta(days=25)).strftime("%Y-%m-%d"), # Warning
            (today + timedelta(days=200)).strftime("%Y-%m-%d"), # Normal
            (today - timedelta(days=10)).strftime("%Y-%m-%d"), # Expired
            (today + timedelta(days=40)).strftime("%Y-%m-%d")  # Normal
        ],
        "금액": [1200000, 5000000, 3000000, 800000, 15000000]
    }
    return pd.DataFrame(data)

def generate_sample_finance_data():
    # Card Statement
    card_data = {
        "승인일자": ["2024-02-01", "2024-02-05", "2024-02-10", "2024-02-15"],
        "승인번호": ["123456", "789012", "345678", "901234"],
        "가맹점": ["식당A", "문구점B", "카페C", "호텔D"],
        "공급가액": [10000, 50000, 20000, 150000],
        "세액": [1000, 5000, 2000, 15000]
    }
    df_card = pd.DataFrame(card_data)
    
    # Internal Report (Some discrepancies)
    report_data = {
        "결의일자": ["2024-02-01", "2024-02-05", "2024-02-10"],
        "승인번호": ["123456", "789012", "345678"], # Missing last one
        "사용내역": ["점심식사", "사무용품", "간식비"],
        "금액": [11000, 55000, 20000], # Discrepancy in last one (20000 vs 22000 card total)
        "예산과목": ["복리후생비", "소모품비", "오기입_과목"] # Intentional error for checking
    }
    df_report = pd.DataFrame(report_data)
    return df_card, df_report

def generate_sample_budget_data():
    categories = ["인건비", "운영비", "사업비", "시설비"]
    months = [f"{i}월" for i in range(1, 13)]
    
    data = []
    for cat in categories:
        total_budget = random.randint(50000000, 200000000)
        current_cumulative = 0
        prev_cumulative = 0
        
        for i, month in enumerate(months):
            # Current year (up to March)
            if i < 3:
                exec_curr = random.randint(1000000, total_budget // 10)
            else:
                exec_curr = 0 # Future
                
            # Previous year (Full data)
            exec_prev = random.randint(1000000, total_budget // 10)
            
            current_cumulative += exec_curr
            prev_cumulative += exec_prev
            
            data.append({
                "월": month,
                "예산과목": cat,
                "총예산": total_budget,
                "당해년도_집행": exec_curr,
                "당해년도_누적": current_cumulative if i < 3 else None,
                "전년도_집행": exec_prev,
                "전년도_누적": prev_cumulative
            })
            
    return pd.DataFrame(data)

def generate_sample_org_data():
    """조직도 분석 기반 샘플 조직 데이터를 생성합니다. (4번째 사진 기반, 원장 중심, 충남콘텐츠산업성장위원회 배제)"""
    data = {
        "조직ID": [
            "ORG_001", "ORG_002", "ORG_003", "ORG_004", "ORG_005", 
            "ORG_006", "ORG_007", "ORG_008", "ORG_009", "ORG_010",
            "ORG_011", "ORG_012", "ORG_013", "ORG_014", "ORG_015"
        ],
        "조직명": [
            "원장", "사무처", "경영기획실", "콘텐츠진흥본부", "기업육성본부",
            "경영지원팀", "ESG경영팀", "콘텐츠진흥팀", "콘텐츠제작팀", "콘텐츠유통팀",
            "기업지원팀", "기업육성팀", "투자유치팀", "미래전략팀", "디지털혁신팀"
        ],
        "상위조직ID": [
            None, "ORG_001", "ORG_001", "ORG_001", "ORG_001",
            "ORG_002", "ORG_002", "ORG_003", "ORG_003", "ORG_003",
            "ORG_004", "ORG_004", "ORG_004", "ORG_001", "ORG_001"
        ],
        "조직레벨": [1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2],
        "조직장사번": [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None], # 예시 데이터
        "사용여부": ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"]
    }
    return pd.DataFrame(data)

# --- Reusable Data Manager UI ---
def get_selection_options(org_df=None):
    """중앙에서 관리되는 선택 옵션들을 반환합니다."""
    options = {
        "부서": ["미정"],
        "직급": ["원장", "사무처장", "본부장", "팀장", "팀원", "연구원"],
        "고용형태": ["정규직", "계약직", "인턴"],
        "성별": ["남", "여"]
    }
    # 조직 데이터프레임이 있으면 부서 목록을 동적으로 채웁니다.
    if org_df is not None and not org_df.empty:
        # '조직명' 컬럼이 있고, 비어있지 않은 값만 가져옵니다.
        if "조직명" in org_df.columns:
            org_names = org_df["조직명"].dropna().unique().tolist()
            if org_names:
                options["부서"] = org_names
    return options

def get_position_grade_map():
    """직급과 직호 매핑 정보를 반환합니다."""
    return {
        "원장": "E1",
        "사무처장": "E2",
        "본부장": "E3",
        "팀장": "M1",
        "팀원": "S1",
        "연구원": "R1"
    }

from dateutil.relativedelta import relativedelta

def get_promotion_rules():
    """직급별 승진 최소 년수 기준을 반환합니다."""
    return {
        "팀원": 5,
        "팀장": 4,
        "본부장": 3,
        "사무처장": 2,
        # 원장은 승진 대상이 아니므로 제외
    }

def render_data_manager(gc, sheet_url, prefix, key_suffix, sample_generator=None):
    """
    Renders a consistent UI for Google Sheet Data Management (Load, Upload New Version, Edit).
    Returns the loaded/managed dataframe.
    """
    st.markdown(f"##### 🗂️ {prefix} 데이터 관리")
    
    # 1. Select Data Source (Tab)
    all_tabs = get_sheet_tabs(gc, sheet_url)
    relevant_tabs = [t for t in all_tabs if t.startswith(prefix)]
    if not relevant_tabs: 
        relevant_tabs = [f"{prefix}_Master"]
    
    relevant_tabs.sort(reverse=True)
    
    col_src, col_act = st.columns([2, 1])
    with col_src:
        selected_tab = st.selectbox(f"데이터 소스 선택 ({prefix})", relevant_tabs, key=f"tab_sel_{key_suffix}")
    with col_act:
        load_btn = st.button("📥 데이터 불러오기", key=f"load_{key_suffix}")

    df_key = f"df_{key_suffix}"
    tab_key = f"tab_{key_suffix}"

    if load_btn:
        with st.spinner("데이터 로드 중..."):
            df_loaded = sync_sheet_to_df(gc, sheet_url, selected_tab)
            if df_loaded is not None and not df_loaded.empty:
                st.session_state[df_key] = df_loaded
                st.session_state[tab_key] = selected_tab
                st.success(f"'{selected_tab}' 로드 완료")
            else:
                st.warning("데이터가 없거나 로드 실패")

    with st.expander(f"📤 신규 {prefix} 데이터 업로드 (새 버전 생성)", expanded=False):
        uploaded_file = st.file_uploader(f"엑셀 파일 업로드 ({prefix})", type=["xlsx", "xls"], key=f"up_{key_suffix}")
        if uploaded_file:
            if st.button("새 탭으로 저장", key=f"save_new_{key_suffix}"):
                try:
                    df_new = pd.read_excel(uploaded_file)
                    success, new_tab_name = create_versioned_tab(gc, sheet_url, prefix, df_new)
                    if success:
                        st.success(f"새 탭 '{new_tab_name}' 생성 완료! 다시 로드해주세요.")
                        st.session_state[df_key] = df_new
                        st.session_state[tab_key] = new_tab_name
                        st.rerun()
                    else:
                        st.error(f"저장 실패: {new_tab_name}")
                except Exception as e:
                    st.error(f"에러: {e}")
        
        if sample_generator:
            if st.button("🔄 샘플 데이터로 덮어쓰기 (테스트용)", key=f"sample_{key_suffix}"):
                df_sample = sample_generator()
                st.session_state[df_key] = df_sample
                st.info("샘플 데이터가 메모리에 로드되었습니다. '수정 반영'을 눌러 시트에 저장하거나 새 버전으로 올리세요.")

    df = st.session_state.get(df_key)
    
    if df is not None:
        st.markdown(f"###### 📝 데이터 편집: {st.session_state.get(tab_key, 'Memory')}")
        
        # 컬럼별 에디터 설정
        column_config = {}
        if key_suffix == "hr": # 인사 데이터에만 적용
            org_df = st.session_state.get("org_df")
            selection_options = get_selection_options(org_df)
            promotion_rules = get_promotion_rules()

            # 승진최소년수충족 컬럼 계산
            today = datetime.now()
            for i in edited_df.index:
                position = edited_df.at[i, "직급"]
                promo_date_str = edited_df.at[i, "현직급승진일"]
                
                try:
                    promo_date = pd.to_datetime(promo_date_str)
                    if pd.notna(promo_date) and position in promotion_rules:
                        min_years = promotion_rules[position]
                        # 총 근무 개월 수 계산
                        delta = relativedelta(today, promo_date)
                        total_months_worked = delta.years * 12 + delta.months
                        total_months_required = min_years * 12
                        
                        progress = min(1.0, total_months_worked / total_months_required) if total_months_required > 0 else 0
                        edited_df.at[i, "승진최소년수충족"] = progress
                    else:
                        edited_df.at[i, "승진최소년수충족"] = 0
                except (ValueError, TypeError):
                    edited_df.at[i, "승진최소년수충족"] = 0

            column_config["부서"] = st.column_config.SelectboxColumn(
                "부서", options=selection_options["부서"], required=True
            )
            column_config["직급"] = st.column_config.SelectboxColumn(
                "직급", options=selection_options["직급"], required=True
            )
            column_config["고용형태"] = st.column_config.SelectboxColumn(
                "고용형태", options=selection_options["고용형태"], required=True
            )
            column_config["성별"] = st.column_config.SelectboxColumn(
                "성별", options=selection_options["성별"], required=True
            )
            column_config["승진최소년수충족"] = st.column_config.ProgressColumn(
                "승진최소년수충족",
                format="%.2f%%",
                min_value=0,
                max_value=1,
            )
            column_config["현직급승진일"] = st.column_config.DateColumn(
                "현직급승진일",
                format="YYYY-MM-DD",
            )
        elif key_suffix == "org": # 조직 데이터에 적용
            # 조직명 선택 시 조직ID 자동 기입을 위한 매핑
            org_name_to_id = {}
            if "조직명" in df.columns and "조직ID" in df.columns:
                org_name_to_id = dict(zip(df["조직명"], df["조직ID"]))
            
            # 조직ID 컬럼 설정 (자동 기입을 위해 disabled=False로 설정)
            column_config["조직ID"] = st.column_config.TextColumn("조직ID", disabled=False)
            
            # 조직레벨 드롭다운
            column_config["조직레벨"] = st.column_config.SelectboxColumn(
                "조직레벨", options=[1, 2, 3, 4], required=True
            )
            
            # 사용여부 드롭다운
            column_config["사용여부"] = st.column_config.SelectboxColumn(
                "사용여부", options=["Y", "N"], required=True
            )
            
            # 상위조직ID 드롭다운 (자기 참조)
            if "상위조직ID" in df.columns:
                parent_org_ids = [""] + df["조직ID"].dropna().unique().tolist()
                column_config["상위조직ID"] = st.column_config.SelectboxColumn(
                    "상위조직ID", options=parent_org_ids, required=False
                )

        edited_df = st.data_editor(
            df, 
            num_rows="dynamic", 
            use_container_width=True, 
            key=f"editor_{key_suffix}",
            column_config=column_config
        )
        
        # 직급 변경 시 직호 자동 업데이트
        if key_suffix == "hr":
            position_map = get_position_grade_map()
            # '직급' 컬럼의 변경사항을 감지하고 '직호'를 업데이트합니다.
            for i in edited_df.index:
                position = edited_df.at[i, "직급"]
                current_grade = edited_df.at[i, "직호"]
                
                # 원본 df와 비교하여 변경되었는지 확인
                original_position = None
                if i in df.index:
                    original_position = df.at[i, "직급"]
                
                # 직급이 변경되었거나, 직호가 비어있을 경우 업데이트
                if position != original_position or pd.isna(current_grade) or current_grade == "":
                    if position in position_map:
                        edited_df.at[i, "직호"] = position_map[position]
        
        # 조직명 변경 시 조직ID 자동 업데이트
        elif key_suffix == "org":
            # '조직명' 컬럼의 변경사항을 감지하고 '조직ID'를 업데이트합니다.
            for i in edited_df.index:
                org_name = edited_df.at[i, "조직명"]
                current_org_id = edited_df.at[i, "조직ID"]
                
                # 원본 df와 비교하여 변경되었는지 확인
                original_org_name = None
                if i in df.index:
                    original_org_name = df.at[i, "조직명"]
                
                # 조직명이 변경되었거나, 조직ID가 비어있을 경우 업데이트
                if org_name != original_org_name or pd.isna(current_org_id) or current_org_id == "":
                    # 조직명에 따라 조직ID를 자동 생성 (예: 조직명의 앞 3글자 + 숫자)
                    if org_name and org_name != "":
                        # 기존 조직ID를 유지하거나, 새로 생성
                        existing_org_ids = df["조직ID"].dropna().tolist() if "조직ID" in df.columns else []
                        new_org_id = f"ORG{len(existing_org_ids) + 1:03d}"
                        edited_df.at[i, "조직ID"] = new_org_id

        col_save, _ = st.columns([1, 3])
        with col_save:
            if st.button("💾 수정사항 반영 (현재 탭 덮어쓰기)", key=f"sync_{key_suffix}"):
                target_tab = st.session_state.get(tab_key)
                if target_tab:
                    if update_sheet_tab(gc, sheet_url, target_tab, edited_df):
                        st.session_state[df_key] = edited_df
                        st.success(f"'{target_tab}' 업데이트 완료")
                    else:
                        st.error("업데이트 실패")
                else:
                    st.warning("저장할 대상 탭이 지정되지 않았습니다. (데이터 로드 필요)")
    
    return df

# --- Google Cloud Helper Functions ---
@st.cache_resource
def get_google_creds(creds_json):
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = Credentials.from_service_account_info(creds_json, scopes=scopes)
    return creds

def get_gspread_client(creds):
    """Initializes gspread client, handling potential session state issues."""
    try:
        # Attempt to create client
        gc = gspread.authorize(creds)
        # Verify connection by listing spreadsheets (optional, but good for validation)
        gc.list_spreadsheet_files()
        st.session_state["gc"] = gc
        return gc
    except Exception as e:
        # 인증 실패 시에도 세션 상태를 유지하여 재인증 시도 가능하도록 함
        st.warning(f"Cloud DB 연결 실패: {e}. 인증 정보는 유지됩니다. 설정에서 다시 시도하세요.")
        return None

def get_drive_service(creds):
    return build('drive', 'v3', credentials=creds)

def upload_file_to_drive(drive_service, file_obj, filename, folder_name="HWP_Storage"):
    # 1. Find or Create Folder
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = drive_service.files().list(q=query, fields="files(id)").execute()
    files = results.get('files', [])
    
    if not files:
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        folder = drive_service.files().create(body=file_metadata, fields='id').execute()
        folder_id = folder.get('id')
    else:
        folder_id = files[0].get('id')
        
    # 2. Upload File
    file_metadata = {
        'name': filename,
        'parents': [folder_id]
    }
    media = MediaIoBaseUpload(file_obj, mimetype='application/octet-stream', resumable=True)
    file = drive_service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    return file.get('webViewLink')

def get_hwp_text(file_obj):
    """Extracts text from HWP 5.0 files using olefile."""
    try:
        f = olefile.OleFileIO(file_obj)
        dirs = f.listdir()
        
        # Check if it is HWP 5.0
        if ["FileHeader"] not in dirs or ["BodyText"] not in dirs:
            return "지원되지 않는 HWP 포맷입니다."

        sections = [d[1] for d in dirs if d[0] == "BodyText"]
        text = ""
        
        for section in sections:
            bodytext = f.openstream("BodyText/" + section).read()
            
            # Decompress
            unpacked_data = zlib.decompress(bodytext, -15)
            
            # Extract text (UTF-16LE)
            # Iterate over the stream to find text chunks
            i = 0
            size = len(unpacked_data)
            while i < size:
                header = struct.unpack_from("<I", unpacked_data, i)[0]
                rec_type = header & 0x3ff
                rec_len = (header >> 20) & 0xfff
                
                if rec_type == 67: # hwptag_para_text
                    rec_data = unpacked_data[i+4:i+4+rec_len]
                    text += rec_data.decode('utf-16le', errors='ignore')
                    text += "\\n"
                
                i += 4 + rec_len
                
        return text
    except Exception as e:
        return f"HWP 텍스트 추출 실패: {e}"

def sync_sheet_to_df(gc, sheet_url, tab_name):
    try:
        sh = gc.open_by_url(sheet_url)
        worksheet = sh.worksheet(tab_name)
        data = worksheet.get_all_records()
        return pd.DataFrame(data)
    except Exception as e:
        st.error(f"Google Sheet Sync Error ({tab_name}): {e}")
        return None

def log_to_sheet(gc, sheet_url, tab_name, row_data):
    try:
        sh = gc.open_by_url(sheet_url)
        try:
            worksheet = sh.worksheet(tab_name)
        except:
            worksheet = sh.add_worksheet(title=tab_name, rows="100", cols="20")
            # Headers are not added here dynamically to avoid mismatch if user created empty tab
            # Ideally, initialization should handle headers.
            
        worksheet.append_row(row_data)
        return True
    except Exception as e:
        st.error(f"Log to Sheet Error: {e}")
        return False

def get_sheet_tabs(gc, sheet_url):
    """Returns a list of tab titles from the sheet."""
    try:
        sh = gc.open_by_url(sheet_url)
        return [ws.title for ws in sh.worksheets()]
    except:
        return []

def create_versioned_tab(gc, sheet_url, base_name, df):
    """Creates a new tab with a date suffix (e.g., 인사_20240213) and uploads data."""
    try:
        sh = gc.open_by_url(sheet_url)
        date_str = datetime.now().strftime("%Y%m%d")
        new_tab_name = f"{base_name}_{date_str}"
        
        # Check if exists, if so append time
        existing_tabs = [ws.title for ws in sh.worksheets()]
        if new_tab_name in existing_tabs:
            new_tab_name = f"{base_name}_{datetime.now().strftime('%Y%m%d_%H%M')}"
            
        ws = sh.add_worksheet(title=new_tab_name, rows=str(len(df)+20), cols=str(len(df.columns)+5))
        ws.update([df.columns.values.tolist()] + df.values.tolist())
        return True, new_tab_name
    except Exception as e:
        return False, str(e)

def get_hub_schemas():
    return {
        "hr": {
            "인사_Master": ["이름", "부서", "직급", "직호", "고용형태", "생년월일", "성별", "입사일", "계약시작일", "계약종료일", "현직급승진일", "승진최소년수충족"],
            "조직_Master": ["조직ID", "조직명", "상위조직ID", "조직레벨", "조직장사번", "사용여부"]
        },
        "accounting": {
            "예산_Master": ["월", "예산과목", "총예산", "당해년도_집행", "당해년도_누적", "전년도_집행", "전년도_누적"],
            "계약_Master": ["계약명", "업체명", "시작일", "종료일", "금액"],
            "카드_Master": ["승인일자", "승인번호", "가맹점", "공급가액", "세액"],
            "지출결의_Master": ["결의일자", "승인번호", "사용내역", "금액", "예산과목"]
        },
        "asset": {
            "자산_Master": ["관리번호", "품목", "모델명", "사용자", "상태", "구입일"]
        },
        "general": {
            "지식관리": ["파일명", "업로드일시", "작성자", "링크", "유형"],
            "HWP_Log": ["파일명", "업로드일시", "작성자", "링크", "유형", "본문"]
        }
    }

def initialize_specific_hub(gc, sheet_url, hub_key):
    """Initializes or updates only the tabs relevant to a specific hub."""
    try:
        sh = gc.open_by_url(sheet_url)
        schemas = get_hub_schemas().get(hub_key)
        
        if not schemas:
            return False, f"Invalid hub key: {hub_key}"
            
        log = []
        existing_tabs = [ws.title for ws in sh.worksheets()]
        
        for tab_name, headers in schemas.items():
            if tab_name in existing_tabs:
                ws = sh.worksheet(tab_name)
                current_headers = ws.row_values(1)
                if current_headers != headers:
                    cell_list = ws.range(1, 1, 1, len(headers))
                    for i, cell in enumerate(cell_list):
                        cell.value = headers[i]
                    ws.update_cells(cell_list)
                    log.append(f"'{tab_name}' 탭 헤더 업데이트 완료")
            else:
                ws = sh.add_worksheet(title=tab_name, rows="100", cols=len(headers) + 5)
                ws.append_row(headers)
                log.append(f"'{tab_name}' 탭 신규 생성 완료")
        
        # Cleanup default sheet only if it's empty and other tabs exist
        if len(sh.worksheets()) > len(schemas):
            for default_sheet_name in ["시트1", "Sheet1"]:
                try:
                    default_sheet = sh.worksheet(default_sheet_name)
                    if not default_sheet.get_all_values():
                        sh.del_worksheet(default_sheet)
                        log.append(f"불필요한 '{default_sheet_name}' 탭 삭제")
                except gspread.WorksheetNotFound:
                    pass
                    
        return True, log
    except Exception as e:
        return False, str(e)

def initialize_distributed_templates(gc, urls_dict):
    """Initializes or updates multiple Google Sheets with specific tabs based on their role."""
    try:
        schemas = get_hub_schemas()
        log = []
        
        for key, schema_data in schemas.items():
            url = urls_dict.get(key)
            if not url:
                continue
            
            try:
                sh = gc.open_by_url(url)
                existing_tabs = [ws.title for ws in sh.worksheets()]
                
                for tab_name, headers in schema_data.items():
                    if tab_name in existing_tabs:
                        # 탭이 이미 존재하면 헤더만 비교/업데이트
                        ws = sh.worksheet(tab_name)
                        current_headers = ws.row_values(1)
                        if current_headers != headers:
                            # 헤더가 다를 경우, 기존 데이터는 유지하고 헤더만 업데이트 (주의: 이 작업은 기존 데이터를 덮어쓸 수 있음)
                            # 여기서는 간단하게 헤더만 업데이트하는 방식을 선택
                            # ws.update('A1', [headers]) # gspread v5+
                            # gspread v3-4 compatible:
                            cell_list = ws.range(1, 1, 1, len(headers))
                            for i, cell in enumerate(cell_list):
                                cell.value = headers[i]
                            ws.update_cells(cell_list)
                            log.append(f"[{key}] '{tab_name}' 탭 헤더 업데이트 완료")
                    else:
                        # 탭이 없으면 새로 생성
                        ws = sh.add_worksheet(title=tab_name, rows="100", cols=len(headers) + 5)
                        ws.append_row(headers)
                        log.append(f"[{key}] '{tab_name}' 탭 신규 생성 완료")

                # '시트1' 또는 'Sheet1'이 비어있고, 다른 탭이 생성되었을 경우에만 삭제
                if len(sh.worksheets()) > 1:
                    for default_sheet_name in ["시트1", "Sheet1"]:
                        try:
                            default_sheet = sh.worksheet(default_sheet_name)
                            if not default_sheet.get_all_values(): # 비어있는 경우
                                sh.del_worksheet(default_sheet)
                                log.append(f"[{key}] 불필요한 '{default_sheet_name}' 탭 삭제")
                        except gspread.WorksheetNotFound:
                            pass
                        
            except Exception as e:
                log.append(f"[{key}] 시트 처리 중 오류: {e}")
                
        return True, log
    except Exception as e:
        return False, str(e)

def update_sheet_tab(gc, sheet_url, tab_name, df):
    """Overwrites a specific tab with the dataframe."""
    try:
        sh = gc.open_by_url(sheet_url)
        ws = sh.worksheet(tab_name)
        ws.clear()
        ws.update([df.columns.values.tolist()] + df.values.tolist())
        return True
    except Exception as e:
        return False, str(e)

def initialize_sheet_template(gc, sheet_url):
    """Initializes the Google Sheet with required tabs and headers."""
    try:
        sh = gc.open_by_url(sheet_url)
        
        # Define schemas
        schemas = {
            "예산_Master": ["월", "예산과목", "총예산", "당해년도_집행", "당해년도_누적", "전년도_집행", "전년도_누적"],
            "계약_Master": ["계약명", "업체명", "시작일", "종료일", "금액"],
            "카드_Master": ["승인일자", "승인번호", "가맹점", "공급가액", "세액"],
            "지출결의_Master": ["결의일자", "승인번호", "사용내역", "금액", "예산과목"],
            "자산_Master": ["관리번호", "품목", "모델명", "사용자", "상태", "구입일"],
            "인사_Master": ["이름", "부서", "직급", "생년월일", "성별", "입사일", "총연차", "사용연차"],
            "지식관리": ["파일명", "업로드일시", "작성자", "링크", "유형"],
            "HWP_Log": ["파일명", "업로드일시", "작성자", "링크", "유형", "본문"]
        }
        
        created_tabs = []
        
        for tab_name, headers in schemas.items():
            try:
                ws = sh.worksheet(tab_name)
                if not ws.get_all_values():
                    ws.append_row(headers)
                    created_tabs.append(f"{tab_name} (헤더 추가)")
            except gspread.WorksheetNotFound:
                ws = sh.add_worksheet(title=tab_name, rows="100", cols="20")
                ws.append_row(headers)
                created_tabs.append(f"{tab_name} (신규 생성)")
        
        # Cleanup default sheet
        try:
            default_sheet = sh.worksheet("시트1")
            sh.del_worksheet(default_sheet)
        except:
            try:
                default_sheet = sh.worksheet("Sheet1")
                sh.del_worksheet(default_sheet)
            except:
                pass
                
        return True, created_tabs
    except Exception as e:
        return False, str(e)

# --- RAG Helper Functions ---
def get_pdf_text(pdf_docs):
    text = ""
    for pdf in pdf_docs:
        pdf_reader = PdfReader(pdf)
        for page in pdf_reader.pages:
            text += page.extract_text()
    return text

def get_text_chunks(text):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_text(text)
    return chunks

def get_vector_store(text_chunks, api_key):
    try:
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)
        vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
        return vector_store
    except Exception as e:
        st.error(f"Vector Store Error: {e}")
        return None

def get_conversational_chain(api_key):
    prompt_template = """
    주어진 Context를 바탕으로 질문에 대해 최대한 자세하고 친절하게 한국어로 답변해줘.
    만약 문서에 없는 내용이라면 "제공된 문서에서 관련 내용을 찾을 수 없습니다."라고 답변해줘.
    
    Context:
    {context}
    
    Question:
    {question}
    
    Answer:
    """
    model = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.3, google_api_key=api_key)
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
    return chain

# --- Login Logic ---
if not st.session_state.get("authentication_status"):
    # Center the login form nicely
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown("<div style='text-align: center; margin-bottom: 20px;' class='slide-up'><h1>🔒 업무 플랫폼 로그인</h1></div>", unsafe_allow_html=True)
        try:
            authenticator.login()
        except Exception as e:
            st.error(f"Authentication Error: {e}")

# --- Application Logic ---
if st.session_state.get("authentication_status"):
    # Lottie Animation for Dashboard
    lottie_dashboard = load_lottieurl("https://lottie.host/embed/9c0c3b8a-9f5e-4c7a-9b8e-1f8a8b8e1f8a/animation.json") # Placeholder

    # --- Sidebar (Authenticated) ---
    with st.sidebar:
        st.image("https://cdn-icons-png.flaticon.com/512/3135/3135715.png", width=80)
        st.markdown("<h2 style='color: #F3F4F6;'>충남콘텐츠진흥원</h2>", unsafe_allow_html=True)
        
        user_name = st.session_state.get("name")
        user_roles = st.session_state.get("roles", ["unknown"])
        current_role = user_roles[0].upper() if user_roles else "UNKNOWN"
        
        st.markdown(f"""
        <div class="glass-card" style="padding: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <h3 style="margin:0; color: #60A5FA;">{user_name}</h3>
            <p style="margin:0; opacity: 0.7; font-size: 0.9em; color: #9CA3AF;">{current_role}</p>
        </div>
        """, unsafe_allow_html=True)
        
        # Connection Status Indicator
        if "google_creds" in st.session_state and "sheet_url" in st.session_state:
            st.success("🟢 Cloud DB: Connected")
        else:
            st.warning("🔴 Cloud DB: Disconnected")
        
        st.divider()
        
        # Dynamic Menu based on Role
        menu_options = ["🏠 홈 (Dashboard)"]
        
        if "admin" in [r.lower() for r in user_roles]:
            menu_options.extend(["💰 회계 허브", "🖥️ 자산 허브", "📂 서무 허브", "🏢 조직도 관리", "📊 인사 통계 대시보드", "📚 공통 지식 허브", "⚙️ 시스템 설정"])
        elif "manager" in [r.lower() for r in user_roles]:
            menu_options.extend(["💰 회계 허브", "🖥️ 자산 허브", "📂 서무 허브"])
        elif "user" in [r.lower() for r in user_roles]:
            menu_options.extend(["📚 공통 지식 허브"])
            
        selection = st.radio("MENU", menu_options, label_visibility="collapsed")
        
        st.divider()
        authenticator.logout("로그아웃", "sidebar")

        # --- Admin Settings for Google Cloud (Sidebar) ---
        if "admin" in [r.lower() for r in user_roles]:
            st.divider()
            with st.expander("☁️ Google Cloud 상태 확인"):
                if "google_creds" in st.session_state:
                     st.success("✅ 인증 정보 로드됨")
                     try:
                         creds = json.loads(json.dumps(st.session_state["google_creds"]))
                         st.write(f"Account: {creds.get('client_email')}")
                     except:
                         pass
                else:
                     st.warning("⚠️ 인증 정보 없음")
                
                if "sheet_urls" in st.session_state:
                    st.write("연결된 시트:")
                    st.json(st.session_state["sheet_urls"])
                elif "sheet_url" in st.session_state:
                    st.write(f"연결된 시트 (Legacy): {st.session_state['sheet_url']}")
                else:
                    st.warning("⚠️ 시트 연결 안됨")
                
                st.markdown("---")
                st.caption("설정 변경은 '⚙️ 시스템 설정' 메뉴에서 진행하세요.")

    # --- Main Content Wrapper for Slide Up ---
    st.markdown('<div class="slide-up">', unsafe_allow_html=True)

    # Header
    st.markdown(f"""
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div>
            <h1 style="margin: 0; background: linear-gradient(90deg, #60A5FA, #A78BFA); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">{selection.split(' ', 1)[1] if ' ' in selection else selection}</h1>
            <p style="margin: 0; opacity: 0.6; font-size: 0.9em;">충남콘텐츠진흥원 스마트워크 플랫폼</p>
        </div>
        <div style="text-align: right;">
            <span style="background: rgba(99, 102, 241, 0.2); color: #818CF8; padding: 6px 16px; border-radius: 20px; font-size: 0.85em; border: 1px solid rgba(99, 102, 241, 0.3);">
                📅 {datetime.now().strftime('%Y-%m-%d')}
            </span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    if "홈 (Dashboard)" in selection:
        # Key Metrics Row
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(label="📋 진행 중인 결재", value="12건", delta="2건")
        with col2:
            st.metric(label="📢 신규 공지사항", value="3건", delta="New", delta_color="off")
        with col3:
            st.metric(label="🗓️ 오늘의 일정", value="4개", delta="-1개")
        with col4:
            st.metric(label="🟢 시스템 상태", value="정상", delta="Stable")
            
        st.markdown("<div style='margin-bottom: 30px;'></div>", unsafe_allow_html=True)
        
        # Dashboard Content
        c1, c2 = st.columns([2, 1])
        with c1:
            st.subheader("📌 주요 공지 및 현황")
            st.markdown("""
            <div class="glass-card">
                <h4 style="color: #60A5FA;">📢 [공지] 2024년도 상반기 워크샵 일정 안내</h4>
                <p style="color: #D1D5DB;">오는 3월 15일, 전 직원 대상 워크샵이 예정되어 있습니다. 부서별 참석 인원을 파악하여...</p>
                <small style="color: #6B7280;">2024-02-12 | 인사팀</small>
            </div>
            <div class="glass-card">
                <h4 style="color: #34D399;">✅ [업무] 법인카드 정산 마감 안내</h4>
                <p style="color: #D1D5DB;">이번 달 법인카드 사용 내역은 25일까지 제출 바랍니다. 기한 엄수 부탁드립니다.</p>
                <small style="color: #6B7280;">2024-02-10 | 재무팀</small>
            </div>
            """, unsafe_allow_html=True)
            
        with c2:
            st.subheader("💡 바로가기")
            # Using lottie if available, else standard image
            lottie_hello = load_lottieurl("https://assets5.lottiefiles.com/packages/lf20_V9t630.json")
            if lottie_hello:
                with st.container():
                    st.markdown('<div class="glass-card" style="display: flex; justify-content: center;">', unsafe_allow_html=True)
                    st_lottie(lottie_hello, height=180, key="hello")
                    st.markdown('</div>', unsafe_allow_html=True)
            else:
                st.info("Animation loading...")

    elif "회계 허브" in selection:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("💰 전사 예산 및 회계 허브")
        
        # Check Google Connection
        gc = None
        sheet_url = None
        if "google_creds" in st.session_state:
            creds = get_google_creds(st.session_state["google_creds"])
            gc = get_gspread_client(creds)
            sheet_url = st.session_state.get("sheet_urls", {}).get("accounting") or st.session_state.get("sheet_url")

        tab1, tab2, tab3 = st.tabs(["📊 예산 관리", "📑 계약 관리", "💳 지출/정산"])
        
        with tab1:
            st.markdown("#### 💹 예산 집행 현황 분석")
            
            if gc and sheet_url:
                df_budget = render_data_manager(gc, sheet_url, "예산", "budget", sample_generator=generate_sample_budget_data)
                
                if df_budget is None or df_budget.empty:
                    st.warning("데이터가 없거나 시트를 불러올 수 없습니다.")
                    if st.button("🚀 회계 시트 양식 초기화", key="init_sheet_acc"):
                        with st.spinner("초기화 중..."):
                            success, log = initialize_specific_hub(gc, sheet_url, "accounting")
                            if success:
                                st.success("완료!")
                                st.rerun()
                            else:
                                st.error(f"실패: {log}")
            else:
                st.warning("⚠️ Google Cloud 연동이 필요합니다. 설정 메뉴를 확인하세요.")
                if st.button("🔄 샘플 예산 데이터 생성 (로컬)", key="sample_budget_local"):
                    st.session_state["df_budget_local"] = generate_sample_budget_data()
                df_budget = st.session_state.get("df_budget_local")

            if df_budget is not None:
                # Metrics
                total_budget = df_budget.groupby("예산과목")["총예산"].max().sum()
                current_exec = df_budget["당해년도_집행"].sum()
                rate = (current_exec / total_budget) * 100
                
                m1, m2, m3 = st.columns(3)
                with m1: st.metric("총 예산액", f"{total_budget:,.0f}원")
                with m2: st.metric("현재 집행액", f"{current_exec:,.0f}원", f"{rate:.1f}% 소진")
                with m3: st.metric("잔여 예산", f"{total_budget - current_exec:,.0f}원")
                
                # Charts
                c1, c2 = st.columns(2)
                with c1:
                    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                    # Monthly Exhaustion Rate
                    monthly_agg = df_budget.groupby("월")["당해년도_집행"].sum().reset_index()
                    # Sort months correctly
                    month_order = [f"{i}월" for i in range(1, 13)]
                    monthly_agg["월"] = pd.Categorical(monthly_agg["월"], categories=month_order, ordered=True)
                    monthly_agg = monthly_agg.sort_values("월")
                    
                    fig_monthly = px.bar(monthly_agg, x="월", y="당해년도_집행", title="월별 예산 집행 추이", template="plotly_dark")
                    fig_monthly.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                    st.plotly_chart(fig_monthly, use_container_width=True)
                    st.markdown('</div>', unsafe_allow_html=True)
                    
                with c2:
                    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                    # YoY Comparison (Cumulative)
                    # Aggregating for line chart
                    yoy_agg = df_budget.groupby("월")[["당해년도_누적", "전년도_누적"]].sum().reset_index()
                    yoy_agg["월"] = pd.Categorical(yoy_agg["월"], categories=month_order, ordered=True)
                    yoy_agg = yoy_agg.sort_values("월")
                    
                    fig_yoy = px.line(yoy_agg, x="월", y=["당해년도_누적", "전년도_누적"], 
                                      title="전년 대비 집행 속도 비교", template="plotly_dark",
                                      color_discrete_map={"당해년도_누적": "#60A5FA", "전년도_누적": "#9CA3AF"})
                    fig_yoy.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                    st.plotly_chart(fig_yoy, use_container_width=True)
                    st.markdown('</div>', unsafe_allow_html=True)
            else:
                st.info("예산 데이터를 업로드하거나 샘플을 생성하세요.")

        with tab2:
            st.markdown("#### ⏳ 계약 현황 및 만료 알림")
            
            if gc and sheet_url:
                df_contract = render_data_manager(gc, sheet_url, "계약", "contract", sample_generator=generate_sample_contract_data)
            else:
                if st.button("🔄 샘플 계약 대장 생성 (로컬)", key="sample_contract_local"):
                    st.session_state["df_contract_local"] = generate_sample_contract_data()
                df_contract = st.session_state.get("df_contract_local")

            if df_contract is not None:
                # Logic for D-Day
                today = datetime.now()
                if not pd.api.types.is_datetime64_any_dtype(df_contract["종료일"]):
                     df_contract["종료일"] = pd.to_datetime(df_contract["종료일"], errors='coerce')
                
                df_contract["남은기간"] = (df_contract["종료일"] - today).dt.days
                
                # Metrics
                total = len(df_contract)
                critical = len(df_contract[df_contract["남은기간"] <= 7])
                warning = len(df_contract[(df_contract["남은기간"] > 7) & (df_contract["남은기간"] <= 30)])
                
                m1, m2, m3 = st.columns(3)
                with m1: st.metric("총 계약 건수", f"{total}건")
                with m2: st.metric("만료 임박 (7일)", f"{critical}건", delta="Critical", delta_color="inverse")
                with m3: st.metric("만료 예정 (30일)", f"{warning}건", delta="Warning", delta_color="inverse")
                
                # Styling function
                def highlight_expiration(row):
                    days = row["남은기간"]
                    if pd.isna(days): return [''] * len(row)
                    if days < 0:
                        return ['background-color: rgba(100, 100, 100, 0.5); color: gray'] * len(row) # Expired
                    elif days <= 7:
                        return ['background-color: rgba(220, 38, 38, 0.3); color: #FECACA'] * len(row) # Red
                    elif days <= 30:
                        return ['background-color: rgba(217, 119, 6, 0.3); color: #FDE68A'] * len(row) # Yellow
                    return [''] * len(row)

                st.dataframe(df_contract.style.apply(highlight_expiration, axis=1), use_container_width=True)
            else:
                st.info("계약 대장 파일을 업로드하거나 샘플 데이터를 생성하세요.")

        with tab3:
            st.markdown("#### 💳 법인카드 지출/정산 및 오기입 체크")
            
            df_card = None
            df_report = None

            if gc and sheet_url:
                col_card, col_report = st.columns(2)
                with col_card:
                    st.info("Step 1. 카드 명세서 데이터")
                    df_card = render_data_manager(gc, sheet_url, "카드", "card")
                with col_report:
                    st.info("Step 2. 지출 결의서 데이터")
                    df_report = render_data_manager(gc, sheet_url, "지출결의", "report")
            else:
                 if st.button("🔄 샘플 대조 데이터 생성 (로컬)", key="sample_finance_local"):
                    c_data, r_data = generate_sample_finance_data()
                    st.session_state["card_data_local"] = c_data
                    st.session_state["report_data_local"] = r_data
                 
                 df_card = st.session_state.get("card_data_local")
                 df_report = st.session_state.get("report_data_local")
            
            if df_card is not None and df_report is not None:
                st.divider()
                
                # --- Error Check Logic ---
                st.markdown("##### 🕵️‍♂️ 지출 결의서 오기입/오류 자동 진단")
                errors = []
                
                # Check 1: Budget Subject Validation (Mock)
                valid_subjects = ["복리후생비", "소모품비", "여비교통비", "회의비"]
                if "예산과목" in df_report.columns:
                    invalid_subjects = df_report[~df_report["예산과목"].isin(valid_subjects)]
                    if not invalid_subjects.empty:
                        for idx, row in invalid_subjects.iterrows():
                            errors.append(f"Row {idx+1}: 유효하지 않은 예산과목 '{row['예산과목']}'")
                            
                # Check 2: Negative Amount
                if "금액" in df_report.columns:
                    negative_amounts = df_report[df_report["금액"] < 0]
                    if not negative_amounts.empty:
                        for idx, row in negative_amounts.iterrows():
                            errors.append(f"Row {idx+1}: 금액이 음수입니다 ({row['금액']}원)")

                if errors:
                    st.error(f"총 {len(errors)}건의 오기입 의심 항목이 발견되었습니다.")
                    for e in errors:
                        st.write(f"- {e}")
                else:
                    st.success("오기입 의심 항목이 없습니다.")
                
                st.divider()
                
                # --- Reconciliation Logic (Existing) ---
                # Preprocessing
                df_card["합계"] = df_card["공급가액"] + df_card["세액"]
                
                # Merge
                merged = pd.merge(df_card, df_report, on="승인번호", how="outer", indicator=True)
                
                # Filter Issues
                # 1. Missing in Report (left_only)
                missing_in_report = merged[merged["_merge"] == "left_only"]
                
                # 2. Amount Mismatch
                # Calculate discrepancy (Card Total - Report Amount)
                # Handle NaNs for calculation
                merged["금액"] = merged["금액"].fillna(0)
                merged["합계"] = merged["합계"].fillna(0)
                merged["차액"] = merged["합계"] - merged["금액"]
                mismatch = merged[(merged["_merge"] == "both") & (merged["차액"] != 0)]
                
                st.warning(f"⚠️ 대조 결과: 미결의 {len(missing_in_report)}건 / 금액 상이 {len(mismatch)}건")
                
                if not missing_in_report.empty:
                    st.markdown("##### 🚨 지출 결의서 누락 항목 (카드 승인 내역 O, 결의서 X)")
                    st.dataframe(missing_in_report[["승인일자", "승인번호", "가맹점", "합계"]], use_container_width=True)
                    
                if not mismatch.empty:
                    st.markdown("##### ⚠️ 금액 불일치 항목")
                    st.dataframe(mismatch[["승인번호", "가맹점", "합계", "금액", "차액"]].rename(columns={"합계":"카드금액", "금액":"결의금액"}), use_container_width=True)
                    
                if missing_in_report.empty and mismatch.empty:
                    st.success("✅ 모든 지출 내역이 일치합니다!")
            else:
                st.info("두 개의 파일을 모두 업로드하거나 샘플 데이터를 생성하세요.")

        st.markdown('</div>', unsafe_allow_html=True)

    elif "자산 허브" in selection:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("🖥️ 자산 허브")
        
        # Check Google Connection
        gc = None
        sheet_url = None
        if "google_creds" in st.session_state:
            creds = get_google_creds(st.session_state["google_creds"])
            gc = get_gspread_client(creds)
            sheet_url = st.session_state.get("sheet_urls", {}).get("asset") or st.session_state.get("sheet_url")
        
        tab1, tab2 = st.tabs(["📋 자산 현황 조회", "➕ 신규 자산 등록"])
        
        with tab1:
            st.markdown("##### 사내 보유 자산 목록")
            
            if gc and sheet_url:
                df_asset = render_data_manager(gc, sheet_url, "자산", "asset", sample_generator=generate_sample_asset_data)
                
                if df_asset is None or df_asset.empty:
                    st.warning("데이터가 없거나 시트를 불러올 수 없습니다.")
                    if st.button("🚀 자산 시트 양식 초기화", key="init_sheet_asset"):
                        with st.spinner("초기화 중..."):
                            success, log = initialize_specific_hub(gc, sheet_url, "asset")
                            if success:
                                st.success("완료!")
                                st.rerun()
                            else:
                                st.error(f"실패: {log}")
            else:
                if st.button("🔄 샘플 자산 생성 (로컬)", key="sample_asset_local"):
                    st.session_state["asset_data_local"] = generate_sample_asset_data()
                df_asset = st.session_state.get("asset_data_local")

            if df_asset is not None:
                
                # Filters
                c1, c2, c3 = st.columns(3)
                with c1:
                    filter_status = st.multiselect("상태 필터", df_asset["상태"].unique(), default=df_asset["상태"].unique())
                with c2:
                    filter_item = st.multiselect("품목 필터", df_asset["품목"].unique(), default=df_asset["품목"].unique())
                with c3:
                    search_user = st.text_input("사용자 검색")
                
                # Apply filters
                mask = (df_asset["상태"].isin(filter_status)) & (df_asset["품목"].isin(filter_item))
                if search_user:
                    mask = mask & (df_asset["사용자"].str.contains(search_user))
                
                st.dataframe(df_asset[mask], use_container_width=True)
                
                # Simple stats
                st.markdown("---")
                s1, s2, s3 = st.columns(3)
                s1.metric("총 자산", f"{len(df_asset)}개")
                s2.metric("사용 중", f"{len(df_asset[df_asset['상태']=='사용중'])}개")
                s3.metric("재고/수리", f"{len(df_asset[df_asset['상태'].isin(['재고', '수리중', '지급대기'])] )}개")
                
            else:
                st.info("샘플 데이터를 생성하거나 DB를 연결하세요.")
                
        with tab2:
            st.markdown("##### 신규 자산 등록")
            with st.form("new_asset_form"):
                c1, c2 = st.columns(2)
                c1.text_input("품목 (예: 노트북)")
                c2.text_input("모델명")
                c1.selectbox("상태", ["재고", "사용중", "수리중", "폐기"])
                c2.text_input("사용자 (공란 가능)")
                c1.date_input("구입일")
                
                submitted = st.form_submit_button("등록")
                if submitted:
                    st.success("자산이 등록되었습니다. (Demo)")
                    
        st.markdown('</div>', unsafe_allow_html=True)

    elif "서무 허브" in selection:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("📂 서무 허브")
        
        tab1, tab2, tab3 = st.tabs(["✈️ 출장 신청", "📝 휴가 신청", "📄 문서(HWP) 업로드"])
        
        with tab1:
            with st.form("trip_form"):
                st.markdown("##### 출장 신청서")
                c1, c2 = st.columns(2)
                c1.text_input("출장지")
                c2.text_input("출장 목적")
                d1, d2 = st.columns(2)
                d1.date_input("시작일")
                d2.date_input("종료일")
                st.text_area("비고")
                if st.form_submit_button("결재 요청"):
                    st.success("출장 신청이 상신되었습니다.")
                    
        with tab2:
            with st.form("leave_form"):
                st.markdown("##### 휴가 신청서")
                st.selectbox("휴가 종류", ["연차", "반차", "병가", "경조사"])
                d1, d2 = st.columns(2)
                d1.date_input("휴가 시작")
                d2.date_input("휴가 종료")
                if st.form_submit_button("휴가 신청"):
                    st.success("휴가 신청이 완료되었습니다.")
        
        with tab3:
            st.markdown("##### HWP 문서 구글 드라이브 업로드")
            
            # Initialization Check for General Hub
            if "google_creds" in st.session_state:
                creds = get_google_creds(st.session_state["google_creds"])
                gc = get_gspread_client(creds)
                sheet_url = st.session_state.get("sheet_urls", {}).get("general") or st.session_state.get("sheet_url")
                
                if sheet_url:
                     try:
                         sh = gc.open_by_url(sheet_url)
                         # Check if key tabs exist
                         tabs = [ws.title for ws in sh.worksheets()]
                         if "지식관리" not in tabs and "HWP_Log" not in tabs:
                             st.warning("서무 시트 양식이 초기화되지 않았습니다.")
                             if st.button("🚀 서무 시트 양식 초기화", key="init_sheet_gen"):
                                 with st.spinner("초기화 중..."):
                                     success, log = initialize_specific_hub(gc, sheet_url, "general")
                                     if success:
                                         st.success("완료!")
                                         st.rerun()
                                     else:
                                         st.error(f"실패: {log}")
                     except:
                         pass

            uploaded_hwp = st.file_uploader("HWP 파일 선택", type=["hwp"])
            if uploaded_hwp:
                if "google_creds" in st.session_state:
                    if st.button("📤 드라이브 저장 및 기록"):
                        with st.spinner("구글 드라이브 업로드 중..."):
                            creds = get_google_creds(st.session_state["google_creds"])
                            sheet_url = st.session_state.get("sheet_urls", {}).get("general") or st.session_state.get("sheet_url")
                            
                            if not sheet_url:
                                st.error("서무(General) 시트가 연결되지 않았습니다.")
                                st.stop()

                            # 1. Upload to Drive
                            drive_service = get_drive_service(creds)
                            link = upload_file_to_drive(drive_service, uploaded_hwp, uploaded_hwp.name)
                            
                            # 2. Extract Text from HWP
                            uploaded_hwp.seek(0) # Reset pointer
                            hwp_text = get_hwp_text(uploaded_hwp)
                            
                            # 3. Log to Sheet with Body Text
                            gc = get_gspread_client(creds)
                            log_data = [
                                uploaded_hwp.name, 
                                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                name, 
                                link,
                                "HWP",
                                hwp_text[:4000] # Limit cell size (Google Sheet limit approx 50k chars, but keep it safe)
                            ]
                            log_to_sheet(gc, sheet_url, "HWP_Log", log_data)
                            st.success(f"업로드 완료! [다운로드 링크]({link})")
                            with st.expander("추출된 텍스트 미리보기"):
                                st.text(hwp_text[:500] + "...")
                else:
                    st.warning("먼저 '설정' 메뉴에서 구글 연동 설정을 완료하세요.")
                    
        st.markdown('</div>', unsafe_allow_html=True)

    elif "조직도 관리" in selection:
        hr_tab5()
    elif "인사 통계 대시보드" in selection:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("📊 인사 마스터 Hub (HR Master)")
        
        # Check Google Connection
        gc = None
        sheet_url = None
        if "google_creds" in st.session_state:
            creds = get_google_creds(st.session_state["google_creds"])
            gc = get_gspread_client(creds)
            sheet_url = st.session_state.get("sheet_urls", {}).get("hr") or st.session_state.get("sheet_url")

        if gc and sheet_url:
            df = render_data_manager(gc, sheet_url, "인사", "hr", sample_generator=generate_sample_data)
            
            # 조직 데이터도 함께 로드
            org_df = None
            try:
                spreadsheet = gc.open_by_url(sheet_url)
                if "조직_Master" in [ws.title for ws in spreadsheet.worksheets()]:
                    org_worksheet = spreadsheet.worksheet("조직_Master")
                    org_df = pd.DataFrame(org_worksheet.get_all_records())
                    st.session_state["org_df"] = org_df
            except Exception as e:
                st.warning(f"조직 데이터 로드 실패: {e}")
                org_df = generate_sample_org_data()
                st.session_state["org_df"] = org_df
            
            if df is None or df.empty:
                st.warning("데이터가 없거나 시트를 불러올 수 없습니다.")
                st.markdown("👉 **아직 시트가 비어있다면 아래 버튼을 눌러 양식을 생성하세요.**")
                if st.button("🚀 시트 양식(Template) 초기화 생성", key="init_sheet_hr"):
                    with st.spinner("구글 시트 양식 생성 중..."):
                        success, log = initialize_specific_hub(gc, sheet_url, "hr")
                        if success:
                            st.success(f"초기화 완료! ({len(log)}개 탭 생성됨)")
                            st.rerun()
                        else:
                            st.error(f"실패: {log}")
        else:
            st.warning("⚠️ Google Cloud 연동이 필요합니다. 설정 메뉴를 확인하세요.")
            if st.button("🔄 샘플 데이터 생성 (로컬)", key="sample_hr_local"):
                st.session_state["df_hr_local"] = generate_sample_data()
                st.session_state["org_df"] = generate_sample_org_data()
            df = st.session_state.get("df_hr_local")
            org_df = st.session_state.get("org_df")
        
        st.markdown('</div>', unsafe_allow_html=True)

        # --- Dashboard Logic ---
        if df is not None:
            # ... (Rest of Analysis Logic) ...
            required_cols = ["부서", "직급", "직호", "고용형태", "생년월일", "성별"]
            # Check for optional '연도' column, if not present, assume current year
            if "연도" not in df.columns:
                df["연도"] = 2024
                
            if not all(col in df.columns for col in required_cols):
                st.error(f"필수 컬럼 누락: {', '.join(required_cols)}")
            else:
                # Data Processing
                df["나이"] = df["생년월일"].apply(lambda x: calculate_age(str(x)))
                df["연령대"] = (df["나이"] // 10) * 10
                df["연령대"] = df["연령대"].astype(str) + "대"
                
                # Check for new columns, fill if missing for robustness
                if "입사일" not in df.columns: df["입사일"] = "2020-01-01"
                if "총연차" not in df.columns: df["총연차"] = 15
                if "사용연차" not in df.columns: df["사용연차"] = 0

                df["근속년수"] = df["입사일"].apply(lambda x: calculate_tenure(str(x)))
                df["예상수당"] = df["근속년수"].apply(calculate_allowance)

                # Tabs for HR Master
                hr_tab1, hr_tab2, hr_tab3, hr_tab4, hr_tab5 = st.tabs(["📈 통계 분석", "🏆 승진/보상 관리", "🏖️ 연차 현황", "🔮 인력수급 시뮬레이션", "🏢 조직도 관리"])

                with hr_tab1:
                    # Filter Section for Interactivity
                    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                    c1, c2 = st.columns(2)
                    with c1:
                        selected_year = st.selectbox("📅 조회 연도 선택", sorted(df["연도"].unique(), reverse=True))
                    with c2:
                        selected_dept = st.multiselect("🏢 부서 필터", df["부서"].unique(), default=df["부서"].unique())
                    st.markdown('</div>', unsafe_allow_html=True)

                    # Filter Data
                    filtered_df = df[(df["연도"] == selected_year) & (df["부서"].isin(selected_dept))]

                    st.markdown("### 📈 데이터 시각화 분석")
                    
                    # Chart Layout
                    row1_col1, row1_col2 = st.columns(2)
                    
                    with row1_col1:
                        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                        dept_counts = filtered_df["부서"].value_counts().reset_index()
                        dept_counts.columns = ["부서", "인원수"]
                        fig_dept = px.bar(dept_counts, x="부서", y="인원수", color="부서", 
                                          title=f"{selected_year}년 부서별 인원 분포", template="plotly_dark")
                        fig_dept.update_layout(transition_duration=500, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_dept, use_container_width=True)
                        st.markdown('</div>', unsafe_allow_html=True)

                with hr_tab5:
                    st.markdown("### 🏢 조직도 관리")
                    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                    
                    # 조직 데이터 관리 도움말
                    with st.expander("📋 조직 데이터 컬럼 설명"):
                        st.markdown("""
                        **조직레벨**: 조직의 계층적 수준을 나타냅니다.
                        - 1: 최상위 조직 (원장)
                        - 2: 본부/실 수준 (사무처, 경영기획실, 콘텐츠진흥본부 등)
                        - 3: 팀 수준 (경영지원팀, ESG경영팀 등)
                        - 4: 하위팀/그룹 수준 (필요시)
                        
                        **조직장사번**: 해당 조직의 책임자 사번을 입력합니다. 미정일 경우 공란으로 둡니다.
                        
                        **사용여부**: 조직의 현재 사용 상태를 나타냅니다.
                        - Y: 활성 조직 (현재 사용 중)
                        - N: 비활성 조직 (폐지 또는 미사용)
                        
                        **상위조직ID**: 상위 조직의 조직ID를 선택합니다. 최상위 조직(원장)은 공란으로 둡니다.
                        """)
                    
                    # 조직 데이터 관리 (render_data_manager 사용)
                    if gc and sheet_url:
                        org_df_managed = render_data_manager(gc, sheet_url, "조직", "org", sample_generator=generate_sample_org_data)
                        if org_df_managed is not None:
                            st.session_state["org_df"] = org_df_managed
                            org_df = org_df_managed
                        else:
                            org_df = st.session_state.get("org_df") or generate_sample_org_data()
                    else:
                        st.warning("⚠️ Google Cloud 연동이 필요합니다. 설정 메뉴를 확인하세요.")
                        if st.button("🔄 샘플 조직 데이터 생성 (로컬)", key="sample_org_local"):
                            st.session_state["org_df_local"] = generate_sample_org_data()
                        org_df = st.session_state.get("org_df_local") or generate_sample_org_data()
                        st.session_state["org_df"] = org_df
                    
                    if org_df is not None and not org_df.empty:
                        # 조직 구조 시각화
                        st.markdown("#### 📊 조직 구조")
                        
                        # 계층별 조직 수
                        level_counts = org_df["조직레벨"].value_counts()
                        fig_level = px.pie(values=level_counts.values, names=level_counts.index, 
                                           title="조직 레벨별 분포", template="plotly_dark")
                        fig_level.update_layout(paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_level, use_container_width=True)
                        
                        # 조직별 인원 수 (인사 데이터와 연동)
                        if df is not None and not df.empty:
                            dept_counts = df["부서"].value_counts().reset_index()
                            dept_counts.columns = ["조직명", "인원수"]
                            
                            # 조직 데이터와 병합
                            org_with_count = org_df.merge(dept_counts, on="조직명", how="left")
                            org_with_count["인원수"] = org_with_count["인원수"].fillna(0)
                            
                            st.markdown("#### 👥 조직별 인원 현황")
                            fig_org_count = px.bar(org_with_count, x="조직명", y="인원수", 
                                                   color="조직레벨", title="조직별 인원 수", template="plotly_dark")
                            fig_org_count.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                            st.plotly_chart(fig_org_count, use_container_width=True)
                        
                        # 조직 상세 정보
                        st.markdown("#### 📋 조직 상세 정보")
                        
                        # 계층 구조로 표시
                        for level in ["실", "본부", "팀"]:
                            level_orgs = org_df[org_df["조직레벨"] == level]
                            if not level_orgs.empty:
                                st.markdown(f"**{level}**")
                                for _, org in level_orgs.iterrows():
                                    st.write(f"- {org['조직명']} (조직장: {org.get('조직장사번', '미정')})")
                        
                        # 전체 조직 데이터 표
                        st.markdown("#### 📊 전체 조직 데이터")
                        st.dataframe(org_df, use_container_width=True)
                        
                        # 조직도 다운로드
                        csv = org_df.to_csv(index=False)
                        st.download_button(
                            label="📥 조직도 데이터 다운로드 (CSV)",
                            data=csv,
                            file_name="조직도_데이터.csv",
                            mime="text/csv"
                        )
                    
                    st.markdown('</div>', unsafe_allow_html=True)
                    
                    with row1_col2:
                        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                        pos_counts = filtered_df["직급"].value_counts().reset_index()
                        pos_counts.columns = ["직급", "인원수"]
                        fig_pos = px.pie(pos_counts, values="인원수", names="직급", hole=0.4,
                                         title=f"{selected_year}년 직급별 인원 분포", template="plotly_dark")
                        fig_pos.update_layout(transition_duration=500, paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_pos, use_container_width=True)
                        st.markdown('</div>', unsafe_allow_html=True)

                    row2_col1, row2_col2 = st.columns(2)
                    
                    with row2_col1:
                        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                        gender_counts = filtered_df["성별"].value_counts().reset_index()
                        gender_counts.columns = ["성별", "인원수"]
                        fig_gender = px.pie(gender_counts, values="인원수", names="성별", hole=0.6,
                                            title="성별 비율", template="plotly_dark")
                        fig_gender.update_layout(transition_duration=500, paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_gender, use_container_width=True)
                        st.markdown('</div>', unsafe_allow_html=True)
                        
                    with row2_col2:
                        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                        # 고용형태별 통계
                        st.markdown("#### 📋 고용형태별 인원 현황")
                        employment_counts = filtered_df["고용형태"].value_counts().reset_index()
                        employment_counts.columns = ["고용형태", "인원수"]
                        fig_employment = px.pie(employment_counts, values="인원수", names="고용형태", hole=0.6,
                                                title="고용형태 비율", template="plotly_dark")
                        fig_employment.update_layout(transition_duration=500, paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_employment, use_container_width=True)
                        st.markdown('</div>', unsafe_allow_html=True)
                        
                    # 3번째 행 추가
                    row3_col1, row3_col2 = st.columns(2)
                    with row3_col1:
                        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                        # 직호별 통계
                        st.markdown("#### 🏢 직호별 인원 현황")
                        position_counts = filtered_df["직호"].value_counts().reset_index()
                        position_counts.columns = ["직호", "인원수"]
                        fig_position = px.bar(position_counts, x="직호", y="인원수", 
                                              title="직호별 인원 분포", template="plotly_dark")
                        fig_position.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_position, use_container_width=True)
                        st.markdown('</div>', unsafe_allow_html=True)
                        
                    with row3_col2:
                        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                        # Animation Frame Demo Chart
                        st.markdown("#### ⏳ 연도별 인원 변화 (Animation Demo)")
                        yearly_counts = df.groupby(["연도", "부서"]).size().reset_index(name="인원수")
                        fig_anim = px.bar(yearly_counts, x="부서", y="인원수", color="부서", 
                                          animation_frame="연도", range_y=[0, 10],
                                          title="연도별 부서 인원 변화 추이", template="plotly_dark")
                        fig_anim.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_anim, use_container_width=True)
                        st.markdown('</div>', unsafe_allow_html=True)

                with hr_tab2:
                    st.markdown("### 🏆 승진 대상자 및 수당 관리")
                    
                    # Logic for Next Month Promotion
                    today = datetime.now()
                    next_month = today.month + 1 if today.month < 12 else 1
                    
                    # Current year data only
                    current_df = df[df["연도"] == df["연도"].max()].copy()
                    
                    # Promotion Candidates (Demo: 3, 6, 9 years tenure & Join month == Next month)
                    def is_promotion_target(row):
                        try:
                            join_date = datetime.strptime(str(row["입사일"]), "%Y-%m-%d")
                            tenure = row["근속년수"]
                            if join_date.month == next_month and tenure > 0 and tenure % 3 == 0:
                                return "대상"
                            return "-"
                        except:
                            return "-"
                            
                    current_df["승진심사"] = current_df.apply(is_promotion_target, axis=1)
                    promotion_targets = current_df[current_df["승진심사"] == "대상"]
                    
                    col_promo, col_allowance = st.columns([1, 1])
                    
                    with col_promo:
                        st.markdown(f'<div class="glass-card"><h4>📅 다음 달({next_month}월) 승진 심사 대상</h4>', unsafe_allow_html=True)
                        if not promotion_targets.empty:
                            st.dataframe(promotion_targets[["이름", "부서", "직급", "입사일", "근속년수"]], use_container_width=True)
                        else:
                            st.info("다음 달 승진 심사 대상자가 없습니다.")
                        st.markdown('</div>', unsafe_allow_html=True)
                        
                    with col_allowance:
                        st.markdown('<div class="glass-card"><h4>💰 근속연수별 예상 수당</h4>', unsafe_allow_html=True)
                        st.dataframe(current_df[["이름", "직급", "근속년수", "예상수당"]].style.format({"예상수당": "{:,.0f}원"}), use_container_width=True)
                        st.markdown('</div>', unsafe_allow_html=True)

                with hr_tab3:
                    st.markdown("### 🏖️ 잔여 연차 현황")
                    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                    
                    # Visualization
                    current_df["잔여연차"] = current_df["총연차"] - current_df["사용연차"]
                    
                    # Melt for bar chart
                    leave_melt = current_df.melt(id_vars=["이름"], value_vars=["사용연차", "잔여연차"], var_name="상태", value_name="일수")
                    
                    fig_leave = px.bar(leave_melt, x="이름", y="일수", color="상태", title="직원별 연차 사용 현황",
                                       color_discrete_map={"사용연차": "#EF4444", "잔여연차": "#3B82F6"}, template="plotly_dark")
                    fig_leave.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                    st.plotly_chart(fig_leave, use_container_width=True)
                    
                    st.markdown("#### 📋 상세 내역")
                    st.dataframe(current_df[["이름", "부서", "총연차", "사용연차", "잔여연차"]], use_container_width=True)
                    st.markdown('</div>', unsafe_allow_html=True)

                with hr_tab4:
                    st.markdown("### 🔮 인력수급 시뮬레이션")
                    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                    
                    # 인력수급 시뮬레이션 실행
                    simulation_df = simulate_workforce_supply_demand(current_df)
                    
                    st.markdown("#### 📊 인력수급 전망")
                    st.dataframe(simulation_df, use_container_width=True)
                    
                    # 시각화
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        fig_supply = px.bar(simulation_df, x="시점", y=["정년퇴직예상인원", "계약만료예상인원"], 
                                            title="예상 퇴사자 수", template="plotly_dark")
                        fig_supply.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_supply, use_container_width=True)
                    
                    with col2:
                        fig_balance = px.bar(simulation_df, x="시점", y=["현재인원", "예상순인원"], 
                                             title="인원 변화", template="plotly_dark")
                        fig_balance.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#E0E0E0"))
                        st.plotly_chart(fig_balance, use_container_width=True)
                    
                    # 상세 예측 정보
                    st.markdown("#### 📋 정년퇴직 예상자")
                    retirement_df = predict_retirement(current_df)
                    if not retirement_df.empty:
                        st.dataframe(retirement_df, use_container_width=True)
                    else:
                        st.info("정년퇴직 예상자가 없습니다.")
                    
                    st.markdown("#### 📋 계약만료 예상자")
                    contract_df = predict_contract_end(current_df)
                    if not contract_df.empty:
                        st.dataframe(contract_df, use_container_width=True)
                    else:
                        st.info("계약만료 예상자가 없습니다.")
                    
                    st.markdown('</div>', unsafe_allow_html=True)

        else:
            st.info("데이터를 업로드하여 분석을 시작하세요.")

    elif "공통 지식 허브" in selection:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.subheader("🤖 AI 지식 허브 & 규정 챗봇 (Cloud Sync)")
        st.markdown("사내 규정 및 업무 매뉴얼을 AI에게 질문하세요.")
        
        # Initialize Chat History
        if "messages" not in st.session_state:
            st.session_state.messages = []

        # Sidebar for Settings
        with st.expander("⚙️ 지식 베이스 설정 (문서 업로드 & API Key)", expanded=False):
            api_key = st.text_input("Google Gemini API Key", type="password", key="gemini_api_key")
            pdf_docs = st.file_uploader("참조할 PDF 문서 업로드", accept_multiple_files=True, type="pdf")
            
            if st.button("📥 문서 학습 및 클라우드 동기화"):
                if not api_key:
                    st.warning("API Key가 없으면 데모 모드로 동작합니다.")
                    st.session_state["vector_store"] = "DEMO"
                    st.success("데모 모드 활성화 완료!")
                elif pdf_docs:
                    with st.spinner("문서 처리 및 클라우드 업로드 중..."):
                        # 1. Process Text & Build Vector Store
                        raw_text = get_pdf_text(pdf_docs)
                        text_chunks = get_text_chunks(raw_text)
                        vector_store = get_vector_store(text_chunks, api_key)
                        
                        if vector_store:
                            st.session_state["vector_store"] = vector_store
                            
                            # 2. Upload to Drive & Log to Sheet (if connected)
                            if "google_creds" in st.session_state and "sheet_url" in st.session_state:
                                creds = st.session_state["google_creds"]
                                drive_service = get_drive_service(creds)
                                gc = get_gspread_client(creds)
                                
                                for pdf in pdf_docs:
                                    pdf.seek(0) # Reset pointer
                                    link = upload_file_to_drive(drive_service, pdf, pdf.name, "Knowledge_Storage")
                                    log_data = [
                                        pdf.name, 
                                        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                        name, 
                                        link,
                                        "PDF_Rule"
                                    ]
                                    log_to_sheet(gc, st.session_state["sheet_url"], "지식관리", log_data)
                                st.success("지식 베이스 구축 및 클라우드 동기화 완료!")
                            else:
                                st.success("로컬 지식 베이스 구축 완료 (클라우드 미연동)")
                else:
                    st.warning("PDF 파일을 업로드해주세요.")

        st.markdown("---")

        # Chat Interface
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        if prompt := st.chat_input("질문을 입력하세요 (예: 출장비 규정이 어떻게 돼?)"):
            # Display user message
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)

            # Display assistant response
            with st.chat_message("assistant"):
                message_placeholder = st.empty()
                full_response = ""
                
                # Logic
                vector_store = st.session_state.get("vector_store")
                api_key = st.session_state.get("gemini_api_key") 
                
                if vector_store == "DEMO" or not api_key:
                    # Demo Mode
                    full_response = f"💡 [데모 모드] 질문하신 '{prompt}'에 대한 규정은 '인사규정 제 3장'에서 확인 가능합니다. (API Key 입력 시 실제 답변)"
                    message_placeholder.markdown(full_response)
                elif vector_store:
                    try:
                        # 1. Check latest rule from Sheet (if connected)
                        latest_rule_info = ""
                        if "google_creds" in st.session_state and "sheet_url" in st.session_state:
                             gc = get_gspread_client(st.session_state["google_creds"])
                             try:
                                 sh = gc.open_by_url(st.session_state["sheet_url"])
                                 ws = sh.worksheet("지식관리")
                                 rows = ws.get_all_values()
                                 if len(rows) > 1:
                                     last_row = rows[-1] # Assuming append order
                                     latest_rule_info = f"\\n\\nℹ️ 참고: 최신 업데이트 규정은 [{last_row[0]}]({last_row[3]}) 입니다."
                             except:
                                 pass

                        # 2. RAG Answer
                        docs = vector_store.similarity_search(prompt)
                        chain = get_conversational_chain(api_key)
                        response = chain({"input_documents": docs, "question": prompt}, return_only_outputs=True)
                        full_response = response["output_text"] + latest_rule_info
                        
                        message_placeholder.markdown(full_response)
                    except Exception as e:
                        full_response = f"⚠️ 에러 발생: {e}"
                        message_placeholder.error(full_response)
                else:
                    full_response = "⚠️ 먼저 문서를 업로드하고 학습 버튼을 눌러주세요."
                    message_placeholder.warning(full_response)
                    
                st.session_state.messages.append({"role": "assistant", "content": full_response})

        st.markdown('</div>', unsafe_allow_html=True)

    elif "시스템 설정" in selection:
        st.subheader("⚙️ 시스템 설정")
        
        st.markdown("### 1. 서비스 계정 인증 (JSON)")
        
        # 세션 상태에서 JSON 문자열 가져오기
        creds_str_from_session = ""
        if "google_creds" in st.session_state:
            try:
                creds_str_from_session = json.dumps(st.session_state["google_creds"], indent=2)
            except Exception:
                creds_str_from_session = ""

        creds_str = st.text_area("JSON Key", 
                                 value=creds_str_from_session, 
                                 height=150, 
                                 help="GCP Service Account Key 내용을 붙여넣으세요.", 
                                 key="json_input_main")
        
        # Show Service Account Info immediately
        if creds_str:
            try:
                creds_json = json.loads(creds_str)
                sa_email = creds_json.get("client_email", "확인 불가")
                st.info(f"🤖 **봇(Service Account) 이메일:** `{sa_email}`")
                st.caption("ℹ️ 이 이메일이 '가상의 직원'처럼 동작합니다. 이 계정의 드라이브 용량이 꽉 차면 오류가 발생합니다.")
            except:
                pass

        st.markdown("### 2. 데이터베이스(구글 시트) 연결")
        
        # Default to Manual Input as it's the most reliable method when quota is full
        connect_mode = st.radio("연결 방식", ["기존 시트 URL 입력 (추천)", "🆕 새 시트 자동 생성 (항목별 분리)"], index=0, key="connect_mode_main")
        
        if connect_mode == "기존 시트 URL 입력 (추천)":
            st.info("""
            **💡 'HQ' 폴더 안에 4개의 시트를 각각 생성하고 URL을 입력하세요.**
            - 예: `HQ_인사`, `HQ_회계`, `HQ_자산`, `HQ_서무`
            - 폴더를 봇 이메일과 공유했다면, 폴더 내 시트는 자동으로 접근 가능합니다.
            """)
            
            url_hr = st.text_input("1. 인사(HR) 시트 URL", key="url_hr_main", value=st.session_state.get("sheet_urls", {}).get("hr", ""))
            url_acc = st.text_input("2. 회계(Accounting) 시트 URL", key="url_acc_main", value=st.session_state.get("sheet_urls", {}).get("accounting", ""))
            url_asset = st.text_input("3. 자산(Asset) 시트 URL", key="url_asset_main", value=st.session_state.get("sheet_urls", {}).get("asset", ""))
            url_gen = st.text_input("4. 서무(General) 시트 URL", key="url_gen_main", value=st.session_state.get("sheet_urls", {}).get("general", ""))
            
            if st.button("연동 테스트 및 저장", key="save_main"):
                if creds_str:
                    try:
                        creds_json = json.loads(creds_str)
                        creds = get_google_creds(creds_json)
                        gc = get_gspread_client(creds)
                        
                        urls = {
                            "hr": url_hr.strip(),
                            "accounting": url_acc.strip(),
                            "asset": url_asset.strip(),
                            "general": url_gen.strip()
                        }
                        
                        # Verify at least one
                        verified_count = 0
                        for k, v in urls.items():
                            if v:
                                try:
                                    sh = gc.open_by_url(v)
                                    verified_count += 1
                                except Exception as e:
                                    st.error(f"[{k}] 접속 실패: {e}")
                        
                        if verified_count > 0:
                            st.session_state["google_creds"] = creds_json
                            st.session_state["sheet_urls"] = urls
                            # Legacy support
                            st.session_state["sheet_url"] = next((v for v in urls.values() if v), "")
                            
                            st.success(f"✅ {verified_count}개의 시트 연동 성공!")
                            
                            # Initialize Check
                            st.markdown("---")
                            st.write("👇 마지막 단계: 각 시트 안에 필요한 탭들을 생성합니다.")
                            if st.button("🔄 시트 양식(Tabs) 초기화", key="init_sheet_dist_main"):
                                    with st.spinner("탭 생성 중..."):
                                        success, msg = initialize_distributed_templates(gc, urls)
                                        if success: 
                                            st.success("초기화 완료!")
                                            for m in msg: st.write(f"- {m}")
                                            st.rerun()
                                        else:
                                            st.error(f"초기화 실패: {msg}")
                        else:
                            st.warning("입력한 URL에 접속할 수 없습니다.")
                    except Exception as e:
                        st.error(f"연동 실패: {e}")
                else:
                    st.warning("JSON Key를 입력하세요.")
                    
        else: # 새 시트 생성 (항목별 분리)
            st.info("서비스 계정이 4개의 구글 시트를 생성하고, 사용자의 구글 계정에 공유합니다.")
            user_email = st.text_input("공유받을 구글 이메일 (Gmail)", placeholder="manager@gmail.com", help="이 이메일로 시트 편집 권한이 부여됩니다.", key="user_email_main")
            
            if st.button("🚀 시트 4개 자동 생성 및 초기화", key="auto_create_main"):
                if creds_str and user_email:
                    try:
                        with st.spinner("시트 생성 및 권한 부여 중... (시간이 걸릴 수 있습니다)"):
                            creds_json = json.loads(creds_str)
                            creds = get_google_creds(creds_json)
                            gc = get_gspread_client(creds)
                            
                            date_str = datetime.now().strftime('%Y%m%d')
                            targets = {
                                "hr": f"충남_인사DB_{date_str}",
                                "accounting": f"충남_회계DB_{date_str}",
                                "asset": f"충남_자산DB_{date_str}",
                                "general": f"충남_서무DB_{date_str}"
                            }
                            
                            created_urls = {}
                            
                            for key, title in targets.items():
                                sh = gc.create(title)
                                sh.share(user_email, perm_type='user', role='writer')
                                created_urls[key] = sh.url
                                st.write(f"✅ 생성 완료: {title}")
                            
                            # Initialize Template
                            success, msg = initialize_distributed_templates(gc, created_urls)
                            
                            # Save Session
                            st.session_state["google_creds"] = creds_json
                            st.session_state["sheet_urls"] = created_urls
                            st.session_state["sheet_url"] = created_urls["hr"]
                            
                            st.success(f"✅ 모든 시트 생성 및 초기화 완료!")
                            st.success(f"📩 '{user_email}' 계정으로 초대장이 발송되었습니다.")
                            st.markdown(f"**팁:** 생성된 시트들을 'HQ' 폴더로 이동시키면 관리가 편합니다.")
                            
                    except Exception as e:
                        error_msg = str(e)
                        if "quota" in error_msg.lower() and "exceeded" in error_msg.lower():
                            st.error("❌ 서비스 계정 용량 초과 (Quota Exceeded)")
                            st.warning("💡 '기존 시트 URL 입력' 방식을 사용하세요.")
                            
                            # Offer cleanup
                            st.markdown("---")
                            st.markdown("##### 🧹 서비스 계정 용량 정리")
                            if st.button("🗑️ 서비스 계정 파일 전체 삭제 (주의)", type="primary", key="cleanup_main"):
                                try:
                                    drive_service = get_drive_service(creds)
                                    results = drive_service.files().list(q="trashed=false", fields="files(id, name)").execute()
                                    files = results.get('files', [])
                                    
                                    if not files:
                                        st.info("삭제할 파일이 없습니다.")
                                    else:
                                        progress_text = st.empty()
                                        deleted_count = 0
                                        for f in files:
                                            try:
                                                drive_service.files().delete(fileId=f['id']).execute()
                                                deleted_count += 1
                                                progress_text.text(f"삭제 중... {f['name']}")
                                            except:
                                                pass
                                        st.success(f"총 {deleted_count}개의 파일을 삭제했습니다. 다시 시도해보세요.")
                                except Exception as cleanup_error:
                                    st.error(f"정리 실패: {cleanup_error}")
                        else:
                            st.error(f"생성 실패: {e}")
                else:
                    st.warning("JSON Key와 이메일을 입력해주세요.")


    st.markdown('</div>', unsafe_allow_html=True) # End Slide Up Wrapper

elif st.session_state.get("authentication_status") is False:
    st.error("❌ 로그인 실패: 사번(Username)과 비밀번호를 확인해주세요.")
    
elif st.session_state.get("authentication_status") is None:
    st.info("👋 사번과 비밀번호를 입력하여 로그인해주세요.")
    col1, col2, col3 = st.columns(3)
    with col2:
        st.markdown("""
        <div class="glass-card" style="text-align:center;">
            <h4>초기 계정 정보</h4>
            <p>Admin: 1111 / 1111</p>
            <p>Manager: 2222 / 2222</p>
            <p>User: 9999 / 9999</p>
        </div>
        """, unsafe_allow_html=True)
