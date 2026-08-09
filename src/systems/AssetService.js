import { ASSET_PATHS } from '../config/constants.js';

export class AssetService {
  constructor() {
    this.indexData = null;
    this.initialized = false;
  }

  async init(indexData = null) {
    if (indexData) {
      this.validateIndexData(indexData);
      this.indexData = indexData;
      this.initialized = true;
      return;
    }

    try {
      const response = await fetch(ASSET_PATHS.assetIndex);
      if (!response.ok) {
        throw new Error(`Failed to load asset index: ${response.statusText}`);
      }
      const data = await response.json();
      this.validateIndexData(data);
      this.indexData = data;
      this.initialized = true;
    } catch (err) {
      this.initialized = false;
      this.indexData = null;
      throw new Error(`AssetService initialization failed: ${err.message}`);
    }
  }

  validateIndexData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid asset index data: must be an object');
    }
    for (const [key, record] of Object.entries(data)) {
      if (!/^\d+$/.test(key)) {
        throw new Error(`Invalid key in asset index: ${key}`);
      }
      if (!record || typeof record !== 'object') {
        throw new Error(`Invalid record for key ${key}`);
      }
      if (!record.png || typeof record.png !== 'string') {
        throw new Error(`Record for key ${key} is missing valid png path`);
      }
    }
  }

  ensureInitialized() {
    if (!this.initialized || !this.indexData) {
      throw new Error('AssetService cannot operate before init');
    }
  }

  isNumericValue(value) {
    if (typeof value === 'number') return !isNaN(value) && isFinite(value);
    if (typeof value === 'string') return /^\d+$/.test(value.trim());
    return false;
  }

  hasValue(value) {
    this.ensureInitialized();
    if (!this.isNumericValue(value)) return false;
    const key = String(value).trim();
    return Object.prototype.hasOwnProperty.call(this.indexData, key);
  }

  getStaticUrl(value) {
    this.ensureInitialized();
    if (!this.isNumericValue(value)) {
      throw new Error(`Non-numeric value rejected: ${value}`);
    }
    const key = String(value).trim();
    const record = this.indexData[key];
    if (!record || !record.png) {
      throw new Error(`PNG asset missing for value: ${value}`);
    }
    return record.png;
  }

  getAnimationUrl(value) {
    this.ensureInitialized();
    if (!this.isNumericValue(value)) {
      throw new Error(`Non-numeric value rejected: ${value}`);
    }
    const key = String(value).trim();
    const record = this.indexData[key];
    if (!record) return null;
    return record.gif || null;
  }

  getFeedbackAsset(value) {
    this.ensureInitialized();
    if (!this.isNumericValue(value)) {
      throw new Error(`Non-numeric value rejected: ${value}`);
    }
    const key = String(value).trim();
    const record = this.indexData[key];
    if (!record) {
      throw new Error(`Asset missing for value: ${value}`);
    }
    if (record.gif) {
      return {
        type: 'gif',
        url: record.gif,
      };
    }
    if (record.png) {
      return {
        type: 'png',
        url: record.png,
      };
    }
    throw new Error(`No valid static or animated asset found for value: ${value}`);
  }

  destroy() {
    this.indexData = null;
    this.initialized = false;
  }
}
