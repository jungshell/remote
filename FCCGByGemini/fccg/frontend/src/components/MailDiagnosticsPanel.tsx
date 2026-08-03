import { Alert, AlertIcon, Badge, Box, Button, Divider, HStack, Spinner, Stack, Text, VStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { getValidToken } from '../api/auth';
import { getApiBaseUrl } from '../config/api';

type MailDiagnostic = {
  mailConfiguration: {
    configured: boolean;
    mode: string;
    gmailUserConfigured: boolean;
    gmailClientIdConfigured: boolean;
    gmailClientSecretConfigured: boolean;
    gmailRefreshTokenConfigured: boolean;
    gmailAppPasswordConfigured: boolean;
    gmailApiConfigured: boolean;
    smtpConfigured: boolean;
  };
  game: { id: number; date: string; time?: string; location: string } | null;
  recipients: Array<{ id: number; name: string; active: boolean; emailConfigured: boolean; eligible: boolean }>;
  unresolvedNames: string[];
  history: Array<{ status: string; recipientId?: number; recipientEmail?: string; error?: string; sentAt?: string; updatedAt: string }>;
};

const statusColor = (status: string) => (status === 'SENT' ? 'green' : status === 'FAILED' ? 'red' : 'yellow');

export default function MailDiagnosticsPanel() {
  const [data, setData] = useState<MailDiagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getValidToken();
      const baseUrl = await getApiBaseUrl();
      const response = await fetch(`${baseUrl}/admin/mail-diagnostics`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error(`진단 API 응답 ${response.status}`);
      setData(await response.json());
    } catch (error) {
      setCheckMessage(error instanceof Error ? error.message : '메일 진단 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const verify = async () => {
    setChecking(true);
    setCheckMessage(null);
    try {
      const token = getValidToken();
      const baseUrl = await getApiBaseUrl();
      const response = await fetch(`${baseUrl}/admin/mail-diagnostics/verify`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await response.json();
      setCheckMessage(result.success ? `전송 설정 확인 완료 (${result.mode}). 실제 이메일은 보내지 않았습니다.` : `전송 설정 확인 실패: ${result.error || result.reason || '원인을 확인하세요.'}`);
      await load();
    } catch (error) {
      setCheckMessage(error instanceof Error ? error.message : '전송 설정 확인에 실패했습니다.');
    } finally {
      setChecking(false);
    }
  };

  const eligibleCount = data?.recipients.filter((recipient) => recipient.eligible).length || 0;
  return (
    <Box borderWidth="1px" borderColor="blue.100" borderRadius="xl" bg="white" p={{ base: 4, md: 5 }}>
      <HStack justify="space-between" align="start" mb={3}>
        <Box>
          <Text fontWeight="800" color="blue.800">메일 발송 진단</Text>
          <Text fontSize="sm" color="gray.600">설정 · 인증 · 확정 명단 · 최근 실패 원인을 실제 메일 없이 점검합니다.</Text>
        </Box>
        <HStack>
          <Button size="sm" variant="outline" onClick={() => void load()} isLoading={loading}>새로고침</Button>
          <Button size="sm" colorScheme="blue" onClick={() => void verify()} isLoading={checking}>전송 설정만 확인</Button>
        </HStack>
      </HStack>
      {checkMessage && <Alert status={checkMessage.includes('실패') ? 'warning' : 'success'} mb={3} borderRadius="md"><AlertIcon /><Text fontSize="sm">{checkMessage}</Text></Alert>}
      {loading && !data ? <HStack py={5} justify="center"><Spinner /><Text>진단 정보를 불러오는 중입니다.</Text></HStack> : data && (
        <Stack spacing={3} fontSize="sm">
          <HStack flexWrap="wrap">
            <Badge colorScheme={data.mailConfiguration.configured ? 'green' : 'red'}>전송 수단: {data.mailConfiguration.mode}</Badge>
            <Badge colorScheme={data.mailConfiguration.gmailUserConfigured ? 'green' : 'red'}>발신 계정</Badge>
            <Badge colorScheme={data.mailConfiguration.gmailApiConfigured ? 'green' : 'gray'}>Gmail API</Badge>
            <Badge colorScheme={data.mailConfiguration.smtpConfigured ? 'green' : 'gray'}>SMTP</Badge>
          </HStack>
          <Text color="gray.600">Gmail API 항목 — Client ID: {data.mailConfiguration.gmailClientIdConfigured ? '확인' : '누락'} · Client secret: {data.mailConfiguration.gmailClientSecretConfigured ? '확인' : '누락'} · Refresh token: {data.mailConfiguration.gmailRefreshTokenConfigured ? '확인' : '누락'}</Text>
          <Divider />
          <Box>
            <Text fontWeight="700">대상 일정</Text>
            <Text color="gray.600">{data.game ? `${new Date(data.game.date).toLocaleDateString('ko-KR')} ${data.game.time || ''} · ${data.game.location}` : '확정된 일정이 없습니다.'}</Text>
            <Text mt={1}>메일 가능 {eligibleCount}명 / 확정 명단 연결 {data.recipients.length}명</Text>
            <HStack mt={2} flexWrap="wrap">
              {data.recipients.map((recipient) => <Badge key={recipient.id} colorScheme={recipient.eligible ? 'green' : 'orange'}>{recipient.name} · {recipient.eligible ? '발송 가능' : !recipient.active ? '비활성/정지' : '이메일 없음'}</Badge>)}
              {data.unresolvedNames.map((name) => <Badge key={name} colorScheme="red">{name} · 회원 연결 없음</Badge>)}
            </HStack>
          </Box>
          <Divider />
          <Box>
            <Text fontWeight="700">최근 확정 메일 이력</Text>
            {data.history.length === 0 ? <Text color="gray.500">아직 기록이 없습니다. 다음 일정 확정부터 수신자별 결과가 저장됩니다.</Text> : (
              <VStack align="stretch" spacing={1} mt={1}>
                {data.history.slice(0, 8).map((item, index) => <HStack key={`${item.updatedAt}-${index}`} justify="space-between" align="start"><Text color="gray.600">수신자 #{item.recipientId || '-'} · {new Date(item.updatedAt).toLocaleString('ko-KR')}</Text><HStack><Badge colorScheme={statusColor(item.status)}>{item.status}</Badge>{item.error && <Text color="red.600" maxW="360px">{item.error}</Text>}</HStack></HStack>)}
              </VStack>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
}
