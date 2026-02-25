import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EstimatedData, ActualData, Target, Advertiser, Device, Program, DeviceProgram } from '../types';
import { calculateTargetPerformances } from '../utils/calculations';
import { formatDate } from '../utils/dateUtils';
import KPICard from './KPICard';
import { useCutoffDate } from '../contexts/CutoffContext';

export default function AdvertiserView() {
  const [estimatedData, setEstimatedData] = useState<EstimatedData[]>([]);
  const [actualData, setActualData] = useState<ActualData[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [devicePrograms, setDevicePrograms] = useState<DeviceProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const { cutoffDate, selectedDeviceId, setSelectedDeviceId } = useCutoffDate();

  useEffect(() => {
    loadData();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-slate-900">Analyse par Annonceur</h2>
          <div className="text-sm text-slate-600">
            Cut-off: {cutoffDate ? formatDate(cutoffDate) : 'N/A'}
          </div>
        </div>
        <p className="text-slate-600">Performance détaillée par annonceur et par cible</p>
      </div>

      {devices.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-900 mb-3">Filtrer par dispositif</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedDeviceId(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedDeviceId === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tous les dispositifs
            </button>
            {devices.map(device => (
              <button
                key={device.id}
                onClick={() => setSelectedDeviceId(device.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedDeviceId === device.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {device.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {advertisers.map(advertiser => {
        const filteredEstimatedData = estimatedData.filter(d => {
          if (selectedDeviceId && d.device_id !== selectedDeviceId) return false;
          return true;
        });

        let filteredActualData = actualData;
        if (selectedDeviceId) {
          const deviceProgramIds = devicePrograms
            .filter(dp => dp.device_id === selectedDeviceId)
            .map(dp => dp.program_id);

          filteredActualData = actualData.filter(ad =>
            ad.advertiser_id === advertiser.id &&
            (ad.program_id === null || deviceProgramIds.includes(ad.program_id))
          );
        } else {
          filteredActualData = actualData.filter(ad => ad.advertiser_id === advertiser.id);
        }

        const performances = calculateTargetPerformances(
          filteredEstimatedData,
          filteredActualData,
          targets,
          advertiser.id,
          cutoffDate,
          false
        );

        const totalEstimated = performances.reduce((sum, p) => sum + p.estimated, 0);
        const totalActual = performances.reduce((sum, p) => sum + p.actual, 0);

        const topPerformer = [...performances]
          .filter(p => p.actual > 0)
          .sort((a, b) => b.delivery_rate - a.delivery_rate)[0];

        const weakPerformer = [...performances]
          .filter(p => p.actual > 0)
          .sort((a, b) => a.delivery_rate - b.delivery_rate)[0];

        return (
          <div key={advertiser.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-bold">{advertiser.name}</h3>
                <div className="text-right">
                  <p className="text-blue-100 text-sm">GRP Délivré</p>
                  <p className="text-3xl font-bold">
                    {new Intl.NumberFormat('fr-FR').format(totalActual)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <p className="text-blue-100">Estimé Total</p>
                  <p className="text-xl font-semibold">
                    {new Intl.NumberFormat('fr-FR').format(totalEstimated)} GRP
                  </p>
                </div>
                <div>
                  <p className="text-blue-100">Réel Total</p>
                  <p className="text-xl font-semibold">
                    {new Intl.NumberFormat('fr-FR').format(totalActual)} GRP
                  </p>
                </div>
                <div>
                  <p className="text-blue-100">Delivery Global</p>
                  <p className="text-xl font-semibold">
                    {totalEstimated > 0 ? ((totalActual / totalEstimated) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {topPerformer && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">
                      Meilleure Performance
                    </h4>
                    <p className="text-lg font-bold text-green-700">{topPerformer.target_name}</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {topPerformer.delivery_rate.toFixed(1)}%
                    </p>
                  </div>
                )}

                {weakPerformer && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-900 mb-2">
                      À Surveiller
                    </h4>
                    <p className="text-lg font-bold text-red-700">{weakPerformer.target_name}</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {weakPerformer.delivery_rate.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Cible</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900">Estimé</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900">Réel</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900">Écart</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900">Delivery</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-900">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performances.map((perf) => (
                      <tr key={perf.target_name} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">{perf.target_name}</td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {new Intl.NumberFormat('fr-FR').format(perf.estimated)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {new Intl.NumberFormat('fr-FR').format(perf.actual)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          perf.gap >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {perf.gap >= 0 ? '+' : ''}{new Intl.NumberFormat('fr-FR').format(perf.gap)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {perf.delivery_rate.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              perf.status === 'ahead'
                                ? 'bg-green-100 text-green-700'
                                : perf.status === 'on-track'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {perf.status === 'ahead' ? 'En avance' :
                               perf.status === 'on-track' ? 'Conforme' : 'En retard'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
