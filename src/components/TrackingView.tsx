import { useEffect, useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EstimatedData, ActualData, Target, Advertiser, Device, Program, DeviceProgram } from '../types';
import { calculateTargetPerformances } from '../utils/calculations';
import { formatDate } from '../utils/dateUtils';
import { useCutoffDate } from '../contexts/CutoffContext';

export default function TrackingView() {
  const [estimatedData, setEstimatedData] = useState<EstimatedData[]>([]);
  const [actualData, setActualData] = useState<ActualData[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [devicePrograms, setDevicePrograms] = useState<DeviceProgram[]>([]);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string | null>(null);
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Suivi à Date</h2>
            <p className="text-slate-600 mt-1">Comparaison estimé vs réel par cible</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>Cut-off: {cutoffDate ? formatDate(cutoffDate) : 'N/A'}</span>
            </div>

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
          </div>
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
                  <td className="py-4 px-4 font-medium text-slate-900">{perf.target_name}</td>
                  <td className="py-4 px-4 text-right text-slate-700">
                    {new Intl.NumberFormat('fr-FR').format(perf.estimated)}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-900">
                    {new Intl.NumberFormat('fr-FR').format(perf.actual)}
                  </td>
                  <td className={`py-4 px-4 text-right font-medium ${
                    perf.gap >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {perf.gap >= 0 ? '+' : ''}{new Intl.NumberFormat('fr-FR').format(perf.gap)}
                  </td>
                  <td className="py-4 px-4 text-right font-semibold">
                    {perf.delivery_rate.toFixed(1)}%
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        perf.status === 'ahead'
                          ? 'bg-green-100 text-green-700'
                          : perf.status === 'on-track'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {perf.status === 'ahead' ? 'En avance' :
                         perf.status === 'on-track' ? 'Sur la route' : 'En retard'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200">
              <tr className="bg-slate-50 font-bold">
                <td className="py-4 px-4">TOTAL</td>
                <td className="py-4 px-4 text-right">
                  {new Intl.NumberFormat('fr-FR').format(
                    performances.reduce((sum, p) => sum + p.estimated, 0)
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  {new Intl.NumberFormat('fr-FR').format(
                    performances.reduce((sum, p) => sum + p.actual, 0)
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  {new Intl.NumberFormat('fr-FR').format(
                    performances.reduce((sum, p) => sum + p.gap, 0)
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  {(performances.reduce((sum, p) => sum + p.actual, 0) /
                    performances.reduce((sum, p) => sum + p.estimated, 0) * 100 || 0).toFixed(1)}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">En Avance</h3>
          <p className="text-3xl font-bold text-green-700">
            {performances.filter(p => p.status === 'ahead').length}
          </p>
          <p className="text-sm text-green-700 mt-1">
            cibles au-dessus de 105%
          </p>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Sur la Route</h3>
          <p className="text-3xl font-bold text-orange-700">
            {performances.filter(p => p.status === 'on-track').length}
          </p>
          <p className="text-sm text-orange-700 mt-1">
            cibles entre 95% et 105%
          </p>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">En Retard</h3>
          <p className="text-3xl font-bold text-red-700">
            {performances.filter(p => p.status === 'behind').length}
          </p>
          <p className="text-sm text-red-700 mt-1">
            cibles en-dessous de 95%
          </p>
        </div>
      </div>
    </div>
  );
}
