import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { parseFlexibleDate } from '../utils/dateUtils';
import ImportedDevicesView from './ImportedDevicesView';

interface MonthStatus {
  month: number;
  year: number;
  label: string;
  hasData: boolean;
  rowCount: number;
}

const MONTHS_TO_IMPORT: { month: number; year: number; label: string }[] = [
  { month: 11, year: 2025, label: 'Novembre 2025' },
  { month: 12, year: 2025, label: 'Décembre 2025' },
  { month: 1, year: 2026, label: 'Janvier 2026' },
  { month: 2, year: 2026, label: 'Février 2026' },
  { month: 3, year: 2026, label: 'Mars 2026' },
  { month: 4, year: 2026, label: 'Avril 2026' },
  { month: 5, year: 2026, label: 'Mai 2026' },
  { month: 6, year: 2026, label: 'Juin 2026' },
  { month: 7, year: 2026, label: 'Juillet 2026' },
];

export default function ImportView() {
  const [estimatedFile, setEstimatedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [monthStatuses, setMonthStatuses] = useState<MonthStatus[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [loadingMonthStatus, setLoadingMonthStatus] = useState(true);
  const [refreshDevices, setRefreshDevices] = useState(0);

  useEffect(() => {
    loadMonthStatuses();
  }, []);

  const loadMonthStatuses = async () => {
    setLoadingMonthStatus(true);
    try {
      const statuses: MonthStatus[] = [];

      for (const monthInfo of MONTHS_TO_IMPORT) {
        const startDate = new Date(monthInfo.year, monthInfo.month - 1, 1);
        const endDate = new Date(monthInfo.year, monthInfo.month, 0);

        const { count, error } = await supabase
          .from('actual_data')
          .select('*', { count: 'exact', head: true })
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        if (error) throw error;

        statuses.push({
          ...monthInfo,
          hasData: (count || 0) > 0,
          rowCount: count || 0
        });
      }

      setMonthStatuses(statuses);
    } catch (error) {
      console.error('Error loading month statuses:', error);
    } finally {
      setLoadingMonthStatus(false);
    }
  };

  const toggleSheet = (sheetName: string) => {
    const newSelected = new Set(selectedSheets);
    if (newSelected.has(sheetName)) {
      newSelected.delete(sheetName);
    } else {
      newSelected.add(sheetName);
    }
    setSelectedSheets(newSelected);
  };

  const handleEstimatedFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEstimatedFile(file);
      setMessage(null);
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        setAvailableSheets(workbook.SheetNames);
        setSelectedSheets(new Set(workbook.SheetNames));
      } catch (error) {
        console.error('Error reading file:', error);
        setMessage({ type: 'error', text: 'Erreur lors de la lecture du fichier' });
      }
    }
  };

  const handleActualFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, monthInfo: { month: number; year: number }) => {
    const file = e.target.files?.[0];
    if (file) {
      setActualFile(file);
      setSelectedMonth(monthInfo);
    }
  };

  const processEstimatedData = async () => {
    if (!estimatedFile) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier de données estimées' });
      return;
    }

    if (selectedSheets.size === 0) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner au moins un dispositif (onglet) à importer' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const data = await estimatedFile.arrayBuffer();
      const workbook = XLSX.read(data);

      if (workbook.SheetNames.length === 0) {
        throw new Error('Le fichier Excel ne contient aucun onglet');
      }

      const { data: existingTargets } = await supabase.from('targets').select('*');
      const { data: existingDevices } = await supabase.from('devices').select('*');
      const targetMap = new Map<string, string>();
      const deviceMap = new Map<string, string>();

      let totalRows = 0;
      let sheetCount = 0;

      for (const sheetName of Array.from(selectedSheets)) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          continue;
        }

        const targetNames = ['Ensemble 25-49', 'Hommes 25-49'];
        const targetColumnIndexes = [6, 7];

        let device = existingDevices?.find(d => d.name === sheetName);
        if (!device) {
          const { data: newDevice, error } = await supabase
            .from('devices')
            .insert({ name: sheetName })
            .select()
            .maybeSingle();

          if (error) throw error;
          device = newDevice;
        }

        if (device) {
          deviceMap.set(sheetName, device.id);
          sheetCount++;
        }

        for (let i = 0; i < targetNames.length; i++) {
          const targetName = targetNames[i];
          const columnIndex = targetColumnIndexes[i];

          let target = existingTargets?.find(t => t.name === targetName);

          if (!target) {
            const { data: newTarget, error } = await supabase
              .from('targets')
              .insert({ name: targetName, column_index: columnIndex })
              .select()
              .maybeSingle();

            if (error) throw error;
            target = newTarget;
          }

          if (target) {
            targetMap.set(targetName, target.id);
          }
        }

        const rows = jsonData.slice(1);
        const insertData = [];
        const deviceId = deviceMap.get(sheetName);

        for (const row of rows) {
          if (!row[2]) continue;

          let dateObj: Date | null;

          if (typeof row[2] === 'number') {
            const parsedDate = XLSX.SSF.parse_date_code(row[2]);
            dateObj = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
          } else {
            dateObj = parseFlexibleDate(String(row[2]));
          }

          if (!dateObj || isNaN(dateObj.getTime())) continue;

          const targetPerformances: Record<string, number> = {};

          for (let i = 0; i < targetNames.length; i++) {
            const targetName = targetNames[i];
            const columnIndex = targetColumnIndexes[i];
            const targetId = targetMap.get(targetName);

            if (targetId && row[columnIndex] !== undefined && row[columnIndex] !== null && row[columnIndex] !== '') {
              const value = parseFloat(row[columnIndex]);
              if (!isNaN(value)) {
                targetPerformances[targetId] = value;
              }
            }
          }

          insertData.push({
            device_id: deviceId,
            date_2025: dateObj.toISOString().split('T')[0],
            date_transposed: dateObj.toISOString().split('T')[0],
            target_performances: targetPerformances
          });
        }

        if (insertData.length > 0) {
          const { error } = await supabase.from('estimated_data').insert(insertData);
          if (error) throw error;
          totalRows += insertData.length;
        }
      }

      if (totalRows > 0) {
        setMessage({
          type: 'success',
          text: `${totalRows} lignes importées depuis ${sheetCount} dispositif(s). Assignez-les aux annonceurs dans les Paramètres.`
        });
        setRefreshDevices(prev => prev + 1);
      } else {
        throw new Error('Aucune donnée valide trouvée dans le fichier');
      }
    } catch (error) {
      console.error('Error processing estimated data:', error);
      setMessage({ type: 'error', text: `Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}` });
    } finally {
      setLoading(false);
    }
  };

  const processActualDataForMonth = async () => {
    if (!actualFile || !selectedMonth) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const data = await actualFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const [targetsRes, productsRes, programsRes, deviceProgramsRes, advertiserDevicesRes] = await Promise.all([
        supabase.from('targets').select('*'),
        supabase.from('products').select('*, advertisers(*)'),
        supabase.from('programs').select('*'),
        supabase.from('device_programs').select('*'),
        supabase.from('advertiser_devices').select('*')
      ]);

      const targets = targetsRes.data || [];
      const products = productsRes.data || [];
      const programs = programsRes.data || [];
      const devicePrograms = deviceProgramsRes.data || [];
      const advertiserDevices = advertiserDevicesRes.data || [];

      const startDate = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
      const endDate = new Date(selectedMonth.year, selectedMonth.month, 0);

      await supabase
        .from('actual_data')
        .delete()
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      const rows = jsonData.slice(1);
      const insertData = [];

      const h2549Target = targets.find(t =>
        t.name === 'H25-49' ||
        t.name === 'Hommes 25-49' ||
        (t.name.includes('25-49') && (t.name.includes('Homme') || t.name.startsWith('H')))
      );
      const ensemble2549Target = targets.find(t =>
        t.name === 'Ensemble 25-49' ||
        (t.name.includes('25-49') && (t.name.includes('Ensemble') || t.name.startsWith('E')))
      );

      if (!h2549Target) {
        throw new Error('Cible H25-49 (Hommes 25-49) introuvable. Veuillez d\'abord importer les données estimées.');
      }
      if (!ensemble2549Target) {
        throw new Error('Cible Ensemble 25-49 introuvable. Veuillez d\'abord importer les données estimées.');
      }

      let totalRows = 0;
      let rowsWithDate = 0;
      let rowsInPeriod = 0;
      let rowsMatched = 0;
      let matchedByProduct = 0;
      let matchedByProgram = 0;
      const unmatchedItems = new Set<string>();

      for (const row of rows) {
        totalRows++;
        if (!row[0]) continue;

        if (totalRows === 1 || totalRows === 2) {
          console.log(`Row ${totalRows}:`, row);
          console.log(`  row[0] (date):`, row[0]);
          console.log(`  row[6] (col G - H2549):`, row[6]);
          console.log(`  row[7] (col H - Ensemble):`, row[7]);
          console.log(`  row[8] (col I - product):`, row[8]);
          console.log(`  row[9] (col J - program):`, row[9]);
        }

        let dateObj: Date;
        if (typeof row[0] === 'number') {
          const dateValue = XLSX.SSF.parse_date_code(row[0]);
          dateObj = new Date(dateValue.y, dateValue.m - 1, dateValue.d);
        } else {
          const parsed = parseFlexibleDate(row[0]);
          if (!parsed) continue;
          dateObj = parsed;
        }

        rowsWithDate++;

        if (dateObj < startDate || dateObj > endDate) continue;

        rowsInPeriod++;

        let advertiserId: string | null = null;
        let productId: string | null = null;
        let programId: string | null = null;

        if (row[8]) {
          const productName = String(row[8]).trim();
          const matchedProduct = products.find(p => {
            const dbName = p.name.toLowerCase().replace('p#', '').trim();
            return productName.toLowerCase().includes(dbName) || dbName.includes(productName.toLowerCase());
          });

          if (matchedProduct) {
            advertiserId = matchedProduct.advertiser_id;
            productId = matchedProduct.id;
            matchedByProduct++;
          }
        }

        if (!advertiserId && row[9]) {
          const programName = String(row[9]).trim();
          const matchedProgram = programs.find(p =>
            p.name.toLowerCase() === programName.toLowerCase()
          );

          if (matchedProgram) {
            const deviceProgram = devicePrograms.find(dp => dp.program_id === matchedProgram.id);
            if (deviceProgram) {
              const advertiserDevice = advertiserDevices.find(ad => ad.device_id === deviceProgram.device_id);
              if (advertiserDevice) {
                advertiserId = advertiserDevice.advertiser_id;
                programId = matchedProgram.id;
                matchedByProgram++;
              }
            }
          }
        }

        if (!advertiserId) {
          const itemInfo = row[8] ? String(row[8]).trim() : (row[9] ? String(row[9]).trim() : 'inconnu');
          unmatchedItems.add(itemInfo);
          continue;
        }

        rowsMatched++;

        const grpH2549 = parseFloat(row[6]) || 0;
        const grpEnsemble2549 = parseFloat(row[7]) || 0;

        const targetPerformances: Record<string, number> = {
          [h2549Target.id]: grpH2549,
          [ensemble2549Target.id]: grpEnsemble2549
        };

        insertData.push({
          advertiser_id: advertiserId,
          product_id: productId,
          program_id: programId,
          date: dateObj.toISOString().split('T')[0],
          target_performances: targetPerformances
        });
      }

      console.log(`Import stats: ${totalRows} total, ${rowsWithDate} with date, ${rowsInPeriod} in period, ${rowsMatched} matched (${matchedByProduct} by product, ${matchedByProgram} by program)`);
      if (unmatchedItems.size > 0) {
        console.log('Unmatched items:', Array.from(unmatchedItems));
      }

      const monthLabel = MONTHS_TO_IMPORT.find(
        m => m.month === selectedMonth.month && m.year === selectedMonth.year
      )?.label || '';

      if (insertData.length > 0) {
        const { error } = await supabase.from('actual_data').insert(insertData);
        if (error) throw error;
        let successMsg = `${insertData.length} lignes importees pour ${monthLabel}`;
        if (unmatchedItems.size > 0) {
          successMsg += `. ${unmatchedItems.size} elements non configures ignores.`;
        }
        setMessage({ type: 'success', text: successMsg });
      } else {
        let errorDetail = `Aucune donnee trouvee pour ${monthLabel}.`;
        if (rowsWithDate === 0) {
          errorDetail += ' Le fichier ne contient pas de dates valides (colonne A).';
        } else if (rowsInPeriod === 0) {
          errorDetail += ` ${rowsWithDate} lignes avec date mais aucune dans la periode ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}.`;
        } else if (rowsMatched === 0) {
          const examples = Array.from(unmatchedItems).slice(0, 3).join(', ');
          errorDetail += ` ${rowsInPeriod} lignes dans la periode mais aucun produit (col I) ou programme (col J) correspondant. Exemples: ${examples}.`;
        }
        setMessage({ type: 'error', text: errorDetail });
      }
      setActualFile(null);
      setSelectedMonth(null);
      await loadMonthStatuses();
    } catch (error) {
      console.error('Error processing actual data:', error);
      setMessage({ type: 'error', text: `Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Données Estimées</h2>
              <p className="text-sm text-slate-600">Dispositifs par onglets</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">Format attendu :</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Chaque onglet = 1 dispositif</li>
                <li>• Colonne C : Date (JJ/MM/AAAA)</li>
                <li>• Colonne G : Ensemble 25-49</li>
                <li>• Colonne H : Hommes 25-49</li>
              </ul>
            </div>

            <label className="block">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleEstimatedFileUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 px-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors font-medium">
                <Upload className="w-5 h-5" />
                <span>{estimatedFile ? estimatedFile.name : 'Sélectionner fichier'}</span>
              </div>
            </label>

            {availableSheets.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">Dispositifs à importer</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableSheets.map(sheet => (
                    <label key={sheet} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSheets.has(sheet)}
                        onChange={() => toggleSheet(sheet)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">{sheet}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={processEstimatedData}
              disabled={!estimatedFile || loading || selectedSheets.size === 0}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Import en cours...' : 'Importer données estimées'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Données Réelles</h2>
              <p className="text-sm text-slate-600">Bilan CDM mensuel</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 font-medium mb-2">Format attendu :</p>
              <ul className="text-xs text-green-800 space-y-1">
                <li>• Colonne A : Date</li>
                <li>• Colonne G : GRP Hommes 25-49</li>
                <li>• Colonne H : GRP Ensemble 25-49</li>
                <li>• Colonne I : Produit</li>
                <li>• Colonne J : Programme</li>
              </ul>
            </div>

            {loadingMonthStatus ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {monthStatuses.map((monthStatus) => (
                  <div
                    key={`${monthStatus.year}-${monthStatus.month}`}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                      monthStatus.hasData
                        ? 'bg-green-50 border-green-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${monthStatus.hasData ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <span className="text-sm font-medium text-slate-900 truncate">{monthStatus.label}</span>
                      {monthStatus.hasData && (
                        <span className="text-xs text-green-700 flex-shrink-0">
                          ({monthStatus.rowCount}L)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <label>
                        <input
                          key={`file-${monthStatus.year}-${monthStatus.month}`}
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => handleActualFileUpload(e, { month: monthStatus.month, year: monthStatus.year })}
                          className="hidden"
                          id={`file-input-${monthStatus.year}-${monthStatus.month}`}
                        />
                        <div className={`flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs font-medium ${
                          selectedMonth?.month === monthStatus.month && selectedMonth?.year === monthStatus.year && actualFile
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}>
                          <Upload className="w-3 h-3" />
                          <span className="hidden sm:inline">
                            {selectedMonth?.month === monthStatus.month && selectedMonth?.year === monthStatus.year && actualFile
                              ? actualFile.name.substring(0, 15) + (actualFile.name.length > 15 ? '...' : '')
                              : 'Upload'
                            }
                          </span>
                        </div>
                      </label>

                      {selectedMonth?.month === monthStatus.month && selectedMonth?.year === monthStatus.year && actualFile && (
                        <button
                          onClick={processActualDataForMonth}
                          disabled={loading}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                        >
                          {loading ? 'Import...' : 'OK'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <ImportedDevicesView key={refreshDevices} />
      </div>
    </div>
  );
}
