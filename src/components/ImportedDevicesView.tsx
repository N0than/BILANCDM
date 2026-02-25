import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, TrendingUp, Loader } from 'lucide-react';

interface ImportedDevice {
  device_id: string;
  device_name: string;
  row_count: number;
  date_range: {
    min: string;
    max: string;
  };
  targets: {
    [targetId: string]: {
      name: string;
      total: number;
      avg: number;
      max: number;
    };
  };
}

interface EstimatedDataRow {
  id: string;
  device_id: string;
  date_transposed: string;
  target_performances: Record<string, number>;
}

export default function ImportedDevicesView() {
  const [devices, setDevices] = useState<ImportedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [deviceRows, setDeviceRows] = useState<EstimatedDataRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  useEffect(() => {
    loadImportedDevices();
  }, []);

  const loadImportedDevices = async () => {
    setLoading(true);
    try {
      const [devicesRes, targetsRes] = await Promise.all([
        supabase.from('devices').select('id, name'),
        supabase.from('targets').select('id, name')
      ]);

      if (devicesRes.error) throw devicesRes.error;
      if (targetsRes.error) throw targetsRes.error;

      const allDevices = devicesRes.data || [];
      const allTargets = targetsRes.data || [];
      const devicesData: ImportedDevice[] = [];

      for (const device of allDevices) {
        const { data: estimatedRows, error: rowsError } = await supabase
          .from('estimated_data')
          .select('id, date_transposed, target_performances')
          .eq('device_id', device.id);

        if (rowsError) throw rowsError;

        if (estimatedRows && estimatedRows.length > 0) {
          const dates = estimatedRows.map(r => r.date_transposed).sort();
          const targetStats: { [targetId: string]: { name: string; values: number[] } } = {};

          estimatedRows.forEach(row => {
            Object.entries(row.target_performances || {}).forEach(([targetId, value]) => {
              if (!targetStats[targetId]) {
                const targetName = allTargets.find(t => t.id === targetId)?.name || targetId;
                targetStats[targetId] = { name: targetName, values: [] };
              }
              if (typeof value === 'number' && value > 0) {
                targetStats[targetId].values.push(value);
              }
            });
          });

          const targets: { [key: string]: any } = {};
          Object.entries(targetStats).forEach(([targetId, stats]) => {
            targets[targetId] = {
              name: stats.name,
              total: Math.round(stats.values.reduce((a, b) => a + b, 0)),
              avg: stats.values.length > 0 ? Math.round(stats.values.reduce((a, b) => a + b, 0) / stats.values.length) : 0,
              max: stats.values.length > 0 ? Math.max(...stats.values) : 0
            };
          });

          devicesData.push({
            device_id: device.id,
            device_name: device.name,
            row_count: estimatedRows.length,
            date_range: {
              min: dates[0],
              max: dates[dates.length - 1]
            },
            targets
          });
        }
      }

      setDevices(devicesData.sort((a, b) => a.device_name.localeCompare(b.device_name)));
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceRows = async (deviceId: string) => {
    setLoadingRows(true);
    try {
      const { data: rows, error } = await supabase
        .from('estimated_data')
        .select('id, device_id, date_transposed, target_performances')
        .eq('device_id', deviceId)
        .order('date_transposed', { ascending: true });

      if (error) throw error;
      setDeviceRows(rows || []);
    } catch (error) {
      console.error('Error loading device rows:', error);
    } finally {
      setLoadingRows(false);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
      return;
    }

    setDeleting(rowId);
    try {
      const { error } = await supabase
        .from('estimated_data')
        .delete()
        .eq('id', rowId);

      if (error) throw error;

      if (expandedDevice) {
        await loadDeviceRows(expandedDevice);
      }
      await loadImportedDevices();
    } catch (error) {
      console.error('Error deleting row:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer toutes les données du dispositif "${deviceName}" ?`)) {
      return;
    }

    setDeleting(deviceId);
    try {
      const { error } = await supabase
        .from('estimated_data')
        .delete()
        .eq('device_id', deviceId);

      if (error) throw error;

      setExpandedDevice(null);
      await loadImportedDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const toggleExpand = async (deviceId: string) => {
    if (expandedDevice === deviceId) {
      setExpandedDevice(null);
    } else {
      setExpandedDevice(deviceId);
      await loadDeviceRows(deviceId);
    }
  };

  const formatGRP = (value: number) => {
    return Math.round(value).toLocaleString('fr-FR');
  };

  const handleDeleteAllDevices = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer TOUS les dispositifs et leurs données ? Cette action est irréversible.')) {
      return;
    }

    setDeleting('all');
    try {
      const { error: deleteDataError } = await supabase
        .from('estimated_data')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (deleteDataError) throw deleteDataError;

      const { error: deleteDevicesError } = await supabase
        .from('devices')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (deleteDevicesError) throw deleteDevicesError;

      setExpandedDevice(null);
      await loadImportedDevices();
    } catch (error) {
      console.error('Error deleting all devices:', error);
      alert('Erreur lors de la suppression de tous les dispositifs');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">Dispositifs importés</h3>
        {devices.length > 0 && (
          <>
            <span className="text-sm text-slate-600 bg-blue-50 px-3 py-1 rounded-full">
              {devices.length} dispositif{devices.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleDeleteAllDevices}
              disabled={deleting === 'all' || devices.length === 0}
              className="ml-auto px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
              title="Supprimer tous les dispositifs"
            >
              Supprimer tous
            </button>
          </>
        )}
      </div>

      {devices.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-600">Aucun dispositif importé pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div key={device.device_id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div
                onClick={() => toggleExpand(device.device_id)}
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{device.device_name}</h4>
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-4 text-sm text-slate-600">
                      <span>{device.row_count} lignes importées</span>
                      <span className="text-slate-500">{device.date_range.min} à {device.date_range.max}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(device.targets).map(([targetId, stats]) => (
                        <div key={targetId} className="bg-slate-100 rounded px-3 py-2">
                          <div className="text-xs font-medium text-slate-700">{stats.name}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            {formatGRP(stats.total)} GRP
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDevice(device.device_id, device.device_name);
                  }}
                  disabled={deleting === device.device_id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Supprimer ce dispositif"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {expandedDevice === device.device_id && (
                <div className="bg-slate-50 border-t border-slate-200 p-4">
                  {loadingRows ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {deviceRows.map((row) => {
                        const grpValues = Object.values(row.target_performances || {})
                          .filter(v => typeof v === 'number') as number[];
                        const grpSum = grpValues.reduce((a, b) => a + b, 0);

                        return (
                          <div
                            key={row.id}
                            className="flex items-center justify-between p-3 bg-white rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-slate-900">{row.date_transposed}</div>
                              <div className="text-sm text-slate-600">
                                {Object.keys(row.target_performances || {}).length} cibles - Total GRP: {formatGRP(grpSum)}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              disabled={deleting === row.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Supprimer cette ligne"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
