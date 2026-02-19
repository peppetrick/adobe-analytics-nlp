#!/usr/bin/env node

/**
 * Script per convertire file Excel di tracking in documentazione RAG
 *
 * Uso:
 *   node scripts/convert-excel-to-rag.js --events=tracking-events.xlsx --decode=decode-mapping.xlsx
 *
 * File Excel attesi:
 * 1. tracking-events.xlsx - Righe=eventi, Colonne=variabili, campi statename/actionname
 * 2. decode-mapping.xlsx - Mapping nomi business → eVar/Props/Eventi
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Parsing argomenti
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const eventsFile = getArg('events');
const decodeFile = getArg('decode');
const outputFile = getArg('output') || 'docs/business-logic/tracking-mapping-generated.md';

if (!eventsFile || !decodeFile) {
  console.error('❌ Missing required arguments!');
  console.log('Usage: node scripts/convert-excel-to-rag.js --events=file1.xlsx --decode=file2.xlsx [--output=output.md]');
  process.exit(1);
}

console.log('📊 Converting Excel files to RAG documentation...');
console.log(`   Events file: ${eventsFile}`);
console.log(`   Decode file: ${decodeFile}`);
console.log(`   Output: ${outputFile}`);

/**
 * Legge un file Excel e restituisce array di oggetti
 */
function readExcel(filePath, sheetName = null) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName || workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
    console.log(`   ✅ Read ${data.length} rows from ${path.basename(filePath)}`);
    return data;
  } catch (error) {
    console.error(`   ❌ Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Costruisce mapping da file decode
 */
function buildMappings(decodeData) {
  const mappings = {
    variables: {}, // nome_business → eVar/prop
    events: {}     // actionName → evento Adobe
  };

  decodeData.forEach(row => {
    // Mapping variabili (assumendo colonne: nome_business, tipo, evar_prop)
    if (row.nome_business && row.evar_prop) {
      mappings.variables[row.nome_business] = {
        technical: row.evar_prop,
        type: row.tipo || 'unknown',
        description: row.descrizione || '',
        examples: row.esempi || ''
      };
    }

    // Mapping eventi (assumendo colonne: actionName, evento_adobe)
    if (row.actionName && row.evento_adobe) {
      mappings.events[row.actionName] = {
        event: row.evento_adobe,
        name: row.nome_evento || row.actionName,
        description: row.descrizione || '',
        variables: row.variabili_associate ? row.variabili_associate.split(',') : []
      };
    }
  });

  return mappings;
}

/**
 * Processa eventi dal file principale
 */
function processEvents(eventsData, mappings) {
  const pageviews = [];
  const customEvents = [];

  eventsData.forEach(row => {
    // Se ha stateName → è pageview
    if (row.statename || row.stateName) {
      const stateName = row.statename || row.stateName;
      pageviews.push({
        stateName: stateName,
        pageName: row.pagename || row.pageName || stateName,
        description: row.descrizione || row.description || '',
        url: row.url || '',
        variables: extractVariables(row, mappings)
      });
    }

    // Se ha actionName → è evento custom
    if (row.actionname || row.actionName) {
      const actionName = row.actionname || row.actionName;
      const eventInfo = mappings.events[actionName] || {};

      customEvents.push({
        actionName: actionName,
        event: eventInfo.event || 'unknown',
        name: eventInfo.name || actionName,
        description: eventInfo.description || row.descrizione || row.description || '',
        variables: extractVariables(row, mappings)
      });
    }
  });

  return { pageviews, customEvents };
}

/**
 * Estrae variabili popolate per una riga
 */
function extractVariables(row, mappings) {
  const variables = [];

  Object.keys(row).forEach(key => {
    if (key.startsWith('var_') && row[key]) {
      const varName = key.replace('var_', '');
      const varInfo = mappings.variables[varName];

      if (varInfo) {
        variables.push({
          business: varName,
          technical: varInfo.technical,
          value: row[key]
        });
      }
    }
  });

  return variables;
}

/**
 * Genera file Markdown
 */
function generateMarkdown(mappings, events) {
  let md = '# Tracking Mapping - Eventi e Variabili\n\n';
  md += '*File generato automaticamente da Excel - NON MODIFICARE MANUALMENTE*\n\n';
  md += `*Generato il: ${new Date().toLocaleString('it-IT')}*\n\n`;

  // Sezione Variabili
  md += '## Mapping Variabili Custom → eVar/Props\n\n';
  md += '### Variabili eVar\n\n';
  md += '| Nome Business | eVar Tecnico | Tipo | Descrizione | Esempi |\n';
  md += '|---------------|--------------|------|-------------|--------|\n';

  Object.entries(mappings.variables)
    .filter(([_, v]) => v.technical.startsWith('eVar'))
    .forEach(([name, info]) => {
      md += `| ${name} | ${info.technical} | ${info.type} | ${info.description} | ${info.examples} |\n`;
    });

  md += '\n### Variabili Props\n\n';
  md += '| Nome Business | Prop Tecnico | Tipo | Descrizione | Esempi |\n';
  md += '|---------------|--------------|------|-------------|--------|\n';

  Object.entries(mappings.variables)
    .filter(([_, v]) => v.technical.startsWith('prop'))
    .forEach(([name, info]) => {
      md += `| ${name} | ${info.technical} | ${info.type} | ${info.description} | ${info.examples} |\n`;
    });

  // Sezione PageViews
  md += '\n---\n\n## Mapping PageViews (stateName popolato)\n\n';
  md += '| stateName | pageName Adobe | Descrizione | URL | Variabili |\n';
  md += '|-----------|----------------|-------------|-----|----------|\n';

  events.pageviews.forEach(pv => {
    const vars = pv.variables.map(v => `${v.business}=${v.technical}`).join(', ') || '-';
    md += `| ${pv.stateName} | ${pv.pageName} | ${pv.description} | ${pv.url} | ${vars} |\n`;
  });

  // Sezione Eventi Custom
  md += '\n---\n\n## Mapping Eventi Custom (actionName popolato)\n\n';
  md += '| actionName | Evento Adobe | Nome | Descrizione | Variabili |\n';
  md += '|------------|--------------|------|-------------|----------|\n';

  events.customEvents.forEach(evt => {
    const vars = evt.variables.map(v => `${v.business}=${v.technical}`).join(', ') || '-';
    md += `| ${evt.actionName} | ${evt.event} | ${evt.name} | ${evt.description} | ${vars} |\n`;
  });

  // Sezione Query Utili
  md += '\n---\n\n## Query Utili Generate\n\n';
  md += '### PageViews\n';
  events.pageviews.slice(0, 10).forEach(pv => {
    md += `- "Mostrami ${pv.pageName} degli ultimi 7 giorni" → pageName = "${pv.pageName}"\n`;
  });

  md += '\n### Eventi Custom\n';
  events.customEvents.slice(0, 10).forEach(evt => {
    md += `- "Quanti ${evt.name} ci sono stati oggi?" → ${evt.event}\n`;
  });

  return md;
}

/**
 * Main execution
 */
try {
  // Leggi files
  const decodeData = readExcel(decodeFile);
  const eventsData = readExcel(eventsFile);

  // Costruisci mappings
  console.log('🔄 Building mappings...');
  const mappings = buildMappings(decodeData);
  console.log(`   ✅ Found ${Object.keys(mappings.variables).length} variable mappings`);
  console.log(`   ✅ Found ${Object.keys(mappings.events).length} event mappings`);

  // Processa eventi
  console.log('🔄 Processing events...');
  const events = processEvents(eventsData, mappings);
  console.log(`   ✅ Found ${events.pageviews.length} pageviews`);
  console.log(`   ✅ Found ${events.customEvents.length} custom events`);

  // Genera Markdown
  console.log('📝 Generating Markdown...');
  const markdown = generateMarkdown(mappings, events);

  // Scrivi output
  const outputPath = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf8');

  console.log(`✅ Successfully generated: ${outputPath}`);
  console.log('\n🔄 Restart server to load updated RAG documentation');
  console.log('   node src/server.js');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
