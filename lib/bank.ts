/** 백엔드 정산 계좌 은행 코드. 순서는 코드 오름차순 — select 옵션 순서로도 사용. */
export const BANK_CODE_LABEL: Record<string, string> = {
  "002": "산업은행 (KDB)",
  "003": "IBK기업은행",
  "004": "KB국민은행",
  "007": "SH수협은행",
  "011": "NH농협은행",
  "020": "우리은행",
  "023": "SC제일은행",
  "027": "한국씨티은행",
  "032": "BNK부산은행",
  "034": "광주은행",
  "035": "제주은행",
  "037": "전북은행",
  "039": "BNK경남은행",
  "045": "새마을금고",
  "048": "신협",
  "071": "우체국",
  "081": "하나은행",
  "088": "신한은행",
  "089": "케이뱅크",
  "090": "카카오뱅크",
  "092": "토스뱅크",
};

export const BANK_CODES = Object.keys(BANK_CODE_LABEL);

export function getBankName(bankCode: string): string {
  return BANK_CODE_LABEL[bankCode] ?? bankCode;
}
