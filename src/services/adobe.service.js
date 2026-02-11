const axios = require('axios');

class AdobeService {
  constructor() {
    this.baseUrl = 'https://analytics.adobe.io/api';
    this.companyId = process.env.ADOBE_COMPANY_ID;
  }

  /**
   * Converte un dateRange testuale in formato Adobe Analytics
   * @param {string} dateRange - es: "today", "last7days", "last30days"
   * @returns {string} - Formato Adobe: "YYYY-MM-DD/YYYY-MM-DD"
   */
  parseDateRange(dateRange) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, endDate;
    
    switch(dateRange) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'last7days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'last30days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case 'last90days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 90);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      default:
        // Default: ultimi 30 giorni
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
    }
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };
    
    return `${formatDate(startDate)}/${formatDate(endDate)}`;
  }

  /**
   * Ottiene un report da Adobe Analytics
   * @param {string} accessToken - Token OAuth dell'utente
   * @param {object} reportRequest - Richiesta report
   * @returns {Promise<Array>} Dati formattati del report
   */
  async getReport(accessToken, reportRequest) {
    // Converti dateRange se presente
    if (reportRequest.globalFilters?.[0]?.dateRange) {
      const dateRangeStr = reportRequest.globalFilters[0].dateRange;
      reportRequest.globalFilters[0].dateRange = this.parseDateRange(dateRangeStr);
    }

    console.log('Adobe API Request:', {
      url: `${this.baseUrl}/${this.companyId}/reports`,
      rsid: reportRequest.rsid,
      metric: reportRequest.metricContainer?.metrics?.[0]?.id,
      dimension: reportRequest.dimension,
      dateRange: reportRequest.globalFilters?.[0]?.dateRange
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.companyId}/reports`,
        reportRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': process.env.ADOBE_CLIENT_ID,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 120 secondi (2 minuti) per query complesse con filtri
        }
      );

      return this.formatReportData(response.data, reportRequest);
      
    } catch (error) {
      console.error('Adobe API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        code: error.code,
        message: error.message,
        config: {
          url: error.config?.url,
          companyId: this.companyId,
          rsid: reportRequest.rsid
        }
      });
      
      // Gestisci timeout
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timeout. Try reducing the date range or narrowing your search.');
      }
      
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 401) {
          throw new Error('Adobe authentication failed. Token may be expired.');
        }
        if (status === 403) {
          throw new Error('Access denied. Check report suite permissions.');
        }
        if (status === 400) {
          throw new Error(`Invalid request: ${JSON.stringify(data)}`);
        }
        if (status === 500) {
          throw new Error(`Adobe server error: ${data.message || data.error_code || 'Internal error'}`);
        }
      }
      
      throw new Error('Failed to fetch report from Adobe Analytics');
    }
  }

  /**
   * Formatta i dati del report per il frontend
   * @param {object} rawData - Dati grezzi da Adobe
   * @param {object} request - Richiesta originale
   * @returns {Array} Dati formattati
   */
  formatReportData(rawData, request) {
    const rows = rawData.rows || [];
    const metricId = rawData.columns?.metric?.[0]?.id || 'value';
    const dimensionName = this.extractDimensionName(request.dimension);
    
    return rows.map(row => {
      const dataPoint = {
        dimension: row.value || 'N/A',
        dimensionName: dimensionName,
        metric: row.data?.[0] || 0
      };

      // Se la dimensione è una data, formattala
      if (request.dimension === 'variables/daterangeday') {
        dataPoint.date = this.formatDate(row.value);
        dataPoint.dimension = dataPoint.date;
      }

      return dataPoint;
    });
  }

  /**
   * Estrae il nome della dimensione dal path
   * @param {string} dimensionPath - es: "variables/evar1"
   * @returns {string}
   */
  extractDimensionName(dimensionPath) {
    if (dimensionPath === 'variables/daterangeday') return 'Date';
    return dimensionPath.split('/')[1] || 'Dimension';
  }

  /**
   * Formatta una data da Adobe (formato YYYYMMDD)
   * @param {string} dateStr - Data in formato Adobe
   * @returns {string} Data formattata
   */
  formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('it-IT', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Testa la connessione ad Adobe Analytics
   * @param {string} accessToken
   * @returns {Promise<object>}
   */
  async testConnection(accessToken) {
    try {
      // Prova a ottenere le report suite disponibili
      const response = await axios.get(
        `${this.baseUrl}/${this.companyId}/collections/suites`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': process.env.ADOBE_CLIENT_ID
          },
          params: {
            limit: 10,
            page: 0
          }
        }
      );

      return {
        connected: true,
        reportSuites: response.data.content?.length || 0,
        companyId: this.companyId
      };
      
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Ottiene le metriche disponibili per una report suite
   * @param {string} accessToken
   * @param {string} rsid
   * @returns {Promise<Array>}
   */
  async getMetrics(accessToken, rsid) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.companyId}/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': process.env.ADOBE_CLIENT_ID
          },
          params: {
            rsid: rsid,
            locale: 'it_IT'
          }
        }
      );

      return response.data;
      
    } catch (error) {
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }
  }

  /**
   * Ottiene le dimensioni disponibili per una report suite
   * @param {string} accessToken
   * @param {string} rsid
   * @returns {Promise<Array>}
   */
  async getDimensions(accessToken, rsid) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.companyId}/dimensions`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': process.env.ADOBE_CLIENT_ID
          },
          params: {
            rsid: rsid,
            locale: 'it_IT'
          }
        }
      );

      return response.data;
      
    } catch (error) {
      throw new Error(`Failed to fetch dimensions: ${error.message}`);
    }
  }
}

module.exports = new AdobeService();
