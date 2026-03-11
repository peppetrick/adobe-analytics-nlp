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

    // Prova a estrarre range dinamico (es: "last2days", "last5days")
    const dynamicMatch = dateRange.match(/^last(\d+)days$/);

    if (dynamicMatch) {
      const numDays = parseInt(dynamicMatch[1]);
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - numDays);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else {
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
    
    // Tutte le dimensioni temporali Adobe: day, hour, week, month
    const isDateDimension = /variables\/daterange(day|hour|week|month)/.test(request.dimension);
    const isHourDimension = request.dimension === 'variables/daterangehour';

    const formatted = rows.map(row => {
      const dataPoint = {
        dimension: row.value || 'N/A',
        dimensionName: dimensionName,
        metric: row.data?.[0] || 0,   // prima metrica (backward compat)
        metrics: row.data || []        // tutte le metriche
      };

      // Se la dimensione è temporale, formattala e conserva il raw per l'ordinamento
      if (isDateDimension) {
        dataPoint.rawDate = row.value; // usato per ordinamento lessicografico
        dataPoint.dimension = isHourDimension
          ? this.formatHour(row.value)
          : this.formatDate(row.value);
      }

      return dataPoint;
    });

    // Per dimensioni temporali, ordina cronologicamente (crescente)
    if (isDateDimension) {
      // Adobe daterangehour restituisce "HH:MM YYYY-MM-DD" → va invertito in
      // "YYYY-MM-DD HH:MM" per ordinare prima per data e poi per ora
      const toSortKey = (raw) => {
        if (!raw) return '';
        const m = raw.match(/^(\d{1,2}:\d{2})\s+(\d{4}-\d{2}-\d{2})$/);
        if (m) return `${m[2]} ${m[1].padStart(5, '0')}`;
        return raw; // YYYYMMDD o altri formati già ordinabili lessicograficamente
      };
      formatted.sort((a, b) => {
        const aKey = toSortKey(a.rawDate || '');
        const bKey = toSortKey(b.rawDate || '');
        return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
      });
      formatted.forEach(d => delete d.rawDate);
    }

    return formatted;
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
   * Formatta un'ora da Adobe (formato YYYYMMDDHH)
   * @param {string} hourStr - Ora in formato Adobe (10 cifre)
   * @returns {string} Ora formattata
   */
  formatHour(hourStr) {
    if (!hourStr) return hourStr;

    // Adobe daterangehour formato: "HH:MM YYYY-MM-DD"
    const m = hourStr.match(/^(\d{1,2}):(\d{2})\s+(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const date = new Date(parseInt(m[3]), parseInt(m[4]) - 1, parseInt(m[5]), parseInt(m[1]), parseInt(m[2]));
      return date.toLocaleString('it-IT', {
        month: 'short',
        day:   'numeric',
        hour:  '2-digit',
        minute: '2-digit'
      });
    }

    // Fallback: formato compatto YYYYMMDDHH (10 cifre)
    if (hourStr.length === 10 && /^\d{10}$/.test(hourStr)) {
      const date = new Date(
        parseInt(hourStr.substring(0, 4)),
        parseInt(hourStr.substring(4, 6)) - 1,
        parseInt(hourStr.substring(6, 8)),
        parseInt(hourStr.substring(8, 10))
      );
      return date.toLocaleString('it-IT', {
        month: 'short',
        day:   'numeric',
        hour:  '2-digit',
        minute: '2-digit'
      });
    }

    return hourStr;
  }

  /**
   * Ottiene un report grezzo (rows con itemId) da Adobe Analytics, senza formattazione.
   * Utile come step preliminare per recuperare gli itemId delle dimensioni.
   * @param {string} accessToken
   * @param {object} reportRequest
   * @returns {Promise<object>} - Risposta raw di Adobe (con rows[].itemId)
   */
  async getRawReport(accessToken, reportRequest) {
    if (reportRequest.globalFilters?.[0]?.dateRange) {
      const dateRangeStr = reportRequest.globalFilters[0].dateRange;
      reportRequest.globalFilters[0].dateRange = this.parseDateRange(dateRangeStr);
    }

    const response = await axios.post(
      `${this.baseUrl}/${this.companyId}/reports`,
      reportRequest,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': process.env.ADOBE_CLIENT_ID,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data;
  }

  /**
   * Crea un segmento temporaneo tramite Adobe Analytics Segments API.
   * Restituisce il segmentId da usare nelle report requests.
   * @param {string} accessToken
   * @param {string} rsid - Report suite ID
   * @param {string} name - Nome del segmento
   * @param {object} definition - Definizione del segmento (formato Adobe)
   * @returns {Promise<string>} segmentId
   */
  async createTempSegment(accessToken, rsid, name, definition) {
    const response = await axios.post(
      `${this.baseUrl}/${this.companyId}/segments`,
      { name, rsid, definition },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': process.env.ADOBE_CLIENT_ID,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    console.log('Created temp segment:', response.data.id, '→', name);
    return response.data.id;
  }

  /**
   * Cerca segmenti predefiniti per nome (es. "iOS", "Android").
   * Restituisce array di { id, name } ordinati per rilevanza.
   * @param {string} accessToken
   * @param {string} searchName - keyword da cercare nel nome del segmento
   * @param {string} rsid - Report suite ID (opzionale, migliora la ricerca)
   * @returns {Promise<Array<{id: string, name: string}>>}
   */
  async searchSegments(accessToken, searchName, rsid) {
    // includeType=all come stringa ripetuta (Adobe non accetta array JSON)
    const params = new URLSearchParams();
    params.append('name', searchName);
    params.append('limit', '20');
    params.append('page', '0');
    params.append('includeType', 'all');
    if (rsid) params.append('rsids', rsid);

    const response = await axios.get(
      `${this.baseUrl}/${this.companyId}/segments?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': process.env.ADOBE_CLIENT_ID
        },
        timeout: 15000
      }
    );
    console.log('Segments API raw response keys:', Object.keys(response.data || {}));
    const items = response.data?.content || response.data?.segments || response.data || [];
    const list = (Array.isArray(items) ? items : []).map(s => ({ id: s.id, name: s.name }));
    console.log('Segments found:', list.map(s => `${s.name} (${s.id})`));
    return list;
  }

  /**
   * Cancella un segmento tramite Adobe Analytics Segments API.
   * @param {string} accessToken
   * @param {string} segmentId
   */
  async deleteSegment(accessToken, segmentId) {
    try {
      await axios.delete(
        `${this.baseUrl}/${this.companyId}/segments/${segmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': process.env.ADOBE_CLIENT_ID
          },
          timeout: 10000
        }
      );
      console.log('Deleted temp segment:', segmentId);
    } catch (err) {
      console.warn('Could not delete temp segment', segmentId, ':', err.message);
    }
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
