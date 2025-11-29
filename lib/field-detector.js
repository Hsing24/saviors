// Field Detector: Form Field Recorder
// 欄位識別與複合識別碼策略

/**
 * 支援的表單欄位選擇器
 */
const FORM_FIELD_SELECTORS = [
  'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
  'textarea',
  'select'
];

/**
 * 取得欄位的複合識別碼
 * @param {HTMLElement} element - 表單元素
 * @returns {FieldIdentifier} - 欄位識別資訊
 */
function getFieldIdentifier(element) {
  if (!element) return null;
  
  const identifier = {
    id: element.id || null,
    name: element.name || null,
    selector: generateSelector(element),
    xpath: null // 備用，目前不實作
  };
  
  return identifier;
}

/**
 * 產生 CSS 選擇器
 * @param {HTMLElement} element
 * @returns {string}
 */
function generateSelector(element) {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  
  if (element.name) {
    const tagName = element.tagName.toLowerCase();
    return `${tagName}[name="${CSS.escape(element.name)}"]`;
  }
  
  // 使用路徑式選擇器
  const path = [];
  let current = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break;
    }
    
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = parent;
  }
  
  return path.join(' > ');
}

/**
 * 取得欄位類型
 * @param {HTMLElement} element
 * @returns {string}
 */
function getFieldType(element) {
  if (!element) return 'other';
  
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'textarea') return 'textarea';
  if (tagName === 'select') return 'select';
  
  if (tagName === 'input') {
    const type = (element.type || 'text').toLowerCase();
    const validTypes = [
      'text', 'email', 'tel', 'number', 'password',
      'date', 'time', 'datetime-local',
      'radio', 'checkbox', 'hidden', 'file'
    ];
    return validTypes.includes(type) ? type : 'other';
  }
  
  return 'other';
}

/**
 * 取得欄位標籤
 * @param {HTMLElement} element
 * @returns {string|null}
 */
function getFieldLabel(element) {
  if (!element) return null;
  
  // 嘗試透過 id 找到 label
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) return label.textContent.trim();
  }
  
  // 嘗試找到包含此元素的 label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    // 移除 input 本身的文字
    const clone = parentLabel.cloneNode(true);
    const inputs = clone.querySelectorAll('input, textarea, select');
    inputs.forEach(input => input.remove());
    return clone.textContent.trim() || null;
  }
  
  // 嘗試使用 placeholder
  if (element.placeholder) {
    return element.placeholder;
  }
  
  // 嘗試使用 aria-label
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label');
  }
  
  return null;
}

/**
 * 取得欄位值
 * @param {HTMLElement} element
 * @returns {string}
 */
function getFieldValue(element) {
  if (!element) return '';
  
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'select') {
    return element.value;
  }
  
  if (tagName === 'input') {
    const type = (element.type || 'text').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      return element.checked ? element.value || 'on' : '';
    }
    return element.value;
  }
  
  return element.value || '';
}

/**
 * 透過識別碼找到元素
 * @param {FieldIdentifier} identifier
 * @returns {HTMLElement|null}
 */
function findElementByIdentifier(identifier) {
  if (!identifier) return null;
  
  // 優先使用 id
  if (identifier.id) {
    const el = document.getElementById(identifier.id);
    if (el) return el;
  }
  
  // 次優先使用 name
  if (identifier.name) {
    const el = document.querySelector(`[name="${CSS.escape(identifier.name)}"]`);
    if (el) return el;
  }
  
  // 最後使用 selector
  if (identifier.selector) {
    try {
      const el = document.querySelector(identifier.selector);
      if (el) return el;
    } catch (e) {
      console.warn('[FieldDetector] Invalid selector:', identifier.selector);
    }
  }
  
  return null;
}

/**
 * 偵測頁面上所有表單欄位
 * @returns {HTMLElement[]}
 */
function detectAllFields() {
  const selector = FORM_FIELD_SELECTORS.join(', ');
  return Array.from(document.querySelectorAll(selector));
}

/**
 * 偵測新增的表單欄位（用於 MutationObserver）
 * @param {Node} root - 根節點
 * @returns {HTMLElement[]}
 */
function detectNewFields(root) {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) return [];
  
  const selector = FORM_FIELD_SELECTORS.join(', ');
  const fields = [];
  
  // 如果 root 本身是表單欄位
  if (root.matches && root.matches(selector)) {
    fields.push(root);
  }
  
  // 尋找 root 內部的表單欄位
  if (root.querySelectorAll) {
    fields.push(...root.querySelectorAll(selector));
  }
  
  return fields;
}

// 導出給 content script 使用
if (typeof window !== 'undefined') {
  window.FieldDetector = {
    getFieldIdentifier,
    getFieldType,
    getFieldLabel,
    getFieldValue,
    findElementByIdentifier,
    detectAllFields,
    detectNewFields,
    FORM_FIELD_SELECTORS
  };
}
