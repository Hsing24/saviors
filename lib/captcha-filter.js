// Captcha Filter: Form Field Recorder
// 驗證碼欄位過濾器

/**
 * 預設驗證碼欄位 blocklist 規則
 */
const DEFAULT_CAPTCHA_PATTERNS = [
  '[name*="captcha"]',
  '[name*="verify"]',
  '[name*="code"]',
  '[id*="captcha"]',
  '[id*="verify"]',
  '[class*="captcha"]',
  '[autocomplete="one-time-code"]',
  'input[type="text"][maxlength="4"]',
  'input[type="text"][maxlength="5"]',
  'input[type="text"][maxlength="6"]'
];

/**
 * 檢查元素是否為驗證碼欄位
 * @param {HTMLElement} element - 要檢查的元素
 * @param {string[]} blocklist - 自訂 blocklist 規則
 * @returns {boolean} - 是否為驗證碼欄位
 */
function isCaptchaField(element, blocklist = DEFAULT_CAPTCHA_PATTERNS) {
  if (!element) return false;
  
  for (const selector of blocklist) {
    try {
      if (element.matches(selector)) {
        return true;
      }
    } catch (e) {
      // 無效的 selector，忽略
      console.warn('[CaptchaFilter] Invalid selector:', selector);
    }
  }
  
  return false;
}

/**
 * 過濾驗證碼欄位
 * @param {HTMLElement[]} elements - 要過濾的元素陣列
 * @param {string[]} blocklist - 自訂 blocklist 規則
 * @returns {HTMLElement[]} - 過濾後的元素陣列
 */
function filterCaptchaFields(elements, blocklist = DEFAULT_CAPTCHA_PATTERNS) {
  return elements.filter(el => !isCaptchaField(el, blocklist));
}

/**
 * 檢查元素是否應該被錄製（非驗證碼、非密碼、非隱藏、非檔案）
 * @param {HTMLElement} element - 要檢查的元素
 * @param {string[]} blocklist - 自訂 blocklist 規則
 * @returns {boolean} - 是否應該被錄製
 */
function shouldRecordField(element, blocklist = DEFAULT_CAPTCHA_PATTERNS) {
  if (!element) return false;
  
  // 排除驗證碼欄位
  if (isCaptchaField(element, blocklist)) {
    return false;
  }
  
  // 排除密碼、隱藏、檔案欄位
  const type = element.type?.toLowerCase() || '';
  const excludedTypes = ['password', 'hidden', 'file'];
  if (excludedTypes.includes(type)) {
    return false;
  }
  
  return true;
}

// 導出給 content script 使用
if (typeof window !== 'undefined') {
  window.CaptchaFilter = {
    isCaptchaField,
    filterCaptchaFields,
    shouldRecordField,
    DEFAULT_CAPTCHA_PATTERNS
  };
}
