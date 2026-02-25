import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EstimatedData, ActualData, Target, Advertiser, Device, Program, DeviceProgram } from '../types';
import { calculateTargetPerformances } from '../utils/calculations';
import { formatDate } from '../utils/dateUtils';
import { useCutoffDate } from '../contexts/CutoffContext';

export default function TargetView() {
  const [estimatedData, setEstimatedData] = useState<EstimatedData[]>([]);
  const [actualData, setActualData] = useState<ActualData[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [devicePrograms, setDevicePrograms] = useState<DeviceProgram[]>([]);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { cutoffDate, selectedDeviceId, setSelectedDeviceId } = useCutoffDate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (targets.length > 0 && !selectedTarget) {
      const defaultTarget = targets.find(t => t.name === 'Hommes 25-49');
      if (defaultTarget) {
        setSelectedTarget(defaultTarget.name);
      }
    }
  }, [targets, selectedTarget]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [estimatedRes, actualRes, targetsRes, advertisersRes, devicesRes, programsRes, deviceProgramsRes] = await Promise.all([
        supabase.from('estimated_data').select('*'),
        supabase.from('actual_data').select('*'),
        supabase.from('targets').select('*').order('column_index'),
        supabase.from('advertisers').select('*'),
        supabase.from('devices').select('*').order('name'),
        supabase.from('programs').select('*'),
        supabase.from('device_programs').select('*')
      ]);

      setEstimatedData(estimatedRes.data || []);
      setActualData(actualRes.data || []);
      setTargets(targetsRes.data || []);
      setAdvertisers(advertisersRes.data || []);
      setDevices(devicesRes.data || []);
      setPrograms(programsRes.data || []);
      setDevicePrograms(deviceProgramsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  const filteredEstimatedData = selectedDeviceId
    ? estimatedData.filter(d => d.device_id === selectedDeviceId)
    : estimatedData;

  let filteredActualData = actualData;
  if (selectedDeviceId) {
    const deviceProgramIds = devicePrograms
      .filter(dp => dp.device_id === selectedDeviceId)
      .map(dp => dp.program_id);

    filteredActualData = actualData.filter(ad =>
      ad.program_id === null || deviceProgramIds.includes(ad.program_id)
    );
  }

  const performances = calculateTargetPerformances(
    filteredEstimatedData,
    filteredActualData,
    targets,
    selectedAdvertiser,
    cutoffDate,
    true
  );

  const filteredPerformances = selectedTarget
    ? performances.filter(p => p.target_name === selectedTarget)
    : performances;

  const maxValue = Math.max(
    ...filteredPerformances.map(p => Math.max(p.estimated, p.actual))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Analyse par Cible</h2>
            <p className="text-slate-600 mt-1">
              Comparaison graphique des performances par cible
            </p>
          </div>
          <div className="text-sm text-slate-600">
            Cut-off: {cutoffDate ? formatDate(cutoffDate) : 'N/A'}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <select
              value={selectedAdvertiser || ''}
              onChange={(e) => setSelectedAdvertiser(e.target.value || null)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les annonceurs</option>
              {advertisers.map(advertiser => (
                <option key={advertiser.id} value={advertiser.id}>
                  {advertiser.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedTarget || ''}
            onChange={(e) => setSelectedTarget(e.target.value || null)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les cibles</option>
            {targets.map(target => (
              <option key={target.id} value={target.name}>
                {target.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">
          Graphique Comparatif Estimé vs Réel
        </h3>

        <div className="space-y-4">
          {filteredPerformances.map((perf) => {
            const estimatedWidth = maxValue > 0 ? (perf.estimated / maxValue) * 100 : 0;
            const actualWidth = maxValue > 0 ? (perf.actual / maxValue) * 100 : 0;

            return (
              <div key={perf.target_name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{perf.target_name}</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    perf.status === 'ahead'
                      ? 'bg-green-100 text-green-700'
                      : perf.status === 'on-track'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {perf.delivery_rate.toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-16">Estimé</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full flex items-center justify-end px-2 transition-all"
                        style={{ width: `${estimatedWidth}%` }}
                      >
                        {estimatedWidth > 15 && (
                          <span className="text-xs font-medium text-white">
                            {new Intl.NumberFormat('fr-FR').format(perf.estimated)}
                          </span>
                        )}
                      </div>
                    </div>
                    {estimatedWidth <= 15 && (
                      <span className="text-xs text-slate-600 w-20 text-right">
                        {new Intl.NumberFormat('fr-FR').format(perf.estimated)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-16">Réel</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden">
                      <div
                        className={`h-full flex items-center justify-end px-2 transition-all ${
                          perf.status === 'ahead'
                            ? 'bg-green-500'
                            : perf.status === 'on-track'
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${actualWidth}%` }}
                      >
                        {actualWidth > 15 && (
                          <span className="text-xs font-medium text-white">
                            {new Intl.NumberFormat('fr-FR').format(perf.actual)}
                          </span>
                        )}
                      </div>
                    </div>
                    {actualWidth <= 15 && (
                      <span className="text-xs text-slate-600 w-20 text-right">
                        {new Intl.NumberFormat('fr-FR').format(perf.actual)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-600 pl-18">
                  Écart: {perf.gap >= 0 ? '+' : ''}{new Intl.NumberFormat('fr-FR').format(perf.gap)} GRP
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-600 mb-4">Distribution des Statuts</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">En avance</span>
              <span className="font-semibold text-green-600">
                {filteredPerformances.filter(p => p.status === 'ahead').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Conforme</span>
              <span className="font-semibold text-orange-600">
                {filteredPerformances.filter(p => p.status === 'on-track').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">En retard</span>
              <span className="font-semibold text-red-600">
                {filteredPerformances.filter(p => p.status === 'behind').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-600 mb-4">Performance Globale</h3>
          <p className="text-3xl font-bold text-blue-600 mb-1">
            {filteredPerformances.length > 0
              ? ((filteredPerformances.reduce((sum, p) => sum + p.actual, 0) /
                  filteredPerformances.reduce((sum, p) => sum + p.estimated, 0)) * 100).toFixed(1)
              : '0'}%
          </p>
          <p className="text-sm text-slate-600">Delivery moyen</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-600 mb-4">Total Points</h3>
          <p className="text-3xl font-bold text-slate-900 mb-1">
            {new Intl.NumberFormat('fr-FR').format(
              filteredPerformances.reduce((sum, p) => sum + p.actual, 0)
            )}
          </p>
          <p className="text-sm text-slate-600">
            sur {new Intl.NumberFormat('fr-FR').format(
              filteredPerformances.reduce((sum, p) => sum + p.estimated, 0)
            )} estimés
          </p>
        </div>
      </div>
    </div>
  );
}
