import { useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EstimatedData, ActualData, Target as TargetType, Advertiser, Device, AdvertiserDevice, Program, DeviceProgram } from '../types';
import { calculateTargetPerformances, filterActualDataByDevice } from '../utils/calculations';
import { useCutoffDate } from '../contexts/CutoffContext';
import KPICard from './KPICard';

const logoMap: Record<string, string> = {
  'McDonalds': '/mcdonalds_france_2009_logo_(1).svg',
  'Coca Cola': '/coca.svg',
  'Uber Eats': '/uber_eats.svg',
  'Betclic': '/logo_betclic_rgb.svg',
};

export interface GlobalViewProps {
  onViewModeChange?: (mode: 'device' | 'advertiser') => void;
  initialViewMode?: 'device' | 'advertiser';
}

export default function GlobalView({ onViewModeChange, initialViewMode = 'device' }: GlobalViewProps) {
  const [estimatedData, setEstimatedData] = useState<EstimatedData[]>([]);
  const [actualData, setActualData] = useState<ActualData[]>([]);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [advertiserDevices, setAdvertiserDevices] = useState<AdvertiserDevice[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [devicePrograms, setDevicePrograms] = useState<DeviceProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'device' | 'advertiser'>(initialViewMode);
  const { cutoffDate } = useCutoffDate();

  const handleViewModeChange = (mode: 'device' | 'advertiser') => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [estimatedRes, actualRes, targetsRes, advertisersRes, devicesRes, advertiserDevicesRes, programsRes, deviceProgramsRes] = await Promise.all([
        supabase.from('estimated_data').select('*'),
        supabase.from('actual_data').select('*'),
        supabase.from('targets').select('*').order('column_index'),
        supabase.from('advertisers').select('*'),
        supabase.from('devices').select('*').order('name'),
        supabase.from('advertiser_devices').select('*'),
        supabase.from('programs').select('*'),
        supabase.from('device_programs').select('*')
      ]);

      setEstimatedData(estimatedRes.data || []);
      setActualData(actualRes.data || []);
      setTargets(targetsRes.data || []);
      setAdvertisers(advertisersRes.data || []);
      setDevices(devicesRes.data || []);
      setAdvertiserDevices(advertiserDevicesRes.data || []);
      setPrograms(programsRes.data || []);
      setDevicePrograms(deviceProgramsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLogoPath = (advertiserName: string): string => {
    return logoMap[advertiserName] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderDeviceView = () => (
    <div className="space-y-6">
      {devices.map(device => {
        const deviceAdvertiserIds = advertiserDevices
          .filter(ad => ad.device_id === device.id)
          .map(ad => ad.advertiser_id);

        const deviceAdvertisers = advertisers.filter(a => deviceAdvertiserIds.includes(a.id));

        if (deviceAdvertisers.length === 0) return null;

        const deviceProgramIds = devicePrograms
          .filter(dp => dp.device_id === device.id)
          .map(dp => dp.program_id);

        return (
          <div key={device.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                  <Tv className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{device.name}</h2>
                  <p className="text-sm text-slate-600">Performance par Annonceur - Cible H25-49</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {deviceAdvertisers.map(advertiser => {
                  const deviceEstimatedDataForAdvertiser = estimatedData.filter(d =>
                    d.device_id === device.id &&
                    d.advertiser_id === advertiser.id &&
                    (d.program_id === null || deviceProgramIds.includes(d.program_id))
                  );

                  const filteredActualData = filterActualDataByDevice(
                    actualData.filter(ad => ad.advertiser_id === advertiser.id),
                    deviceProgramIds
                  );

                  const performances = calculateTargetPerformances(
                    deviceEstimatedDataForAdvertiser,
                    filteredActualData,
                    targets,
                    advertiser.id,
                    cutoffDate,
                    true
                  );

                  const h2549Perf = performances.find(p =>
                    p.target_name === 'H25-49' ||
                    p.target_name === 'Hommes 25-49' ||
                    (p.target_name.includes('25-49') && (p.target_name.includes('Homme') || p.target_name.startsWith('H')))
                  );

                  const estimatedH2549 = h2549Perf?.estimated || 0;
                  const actualH2549 = h2549Perf?.actual || 0;
                  const delivery = h2549Perf?.delivery_rate || 0;
                  const status = h2549Perf?.status || 'behind';

                  const logoPath = getLogoPath(advertiser.name);

                  return (
                    <div
                      key={advertiser.id}
                      className={`group relative rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                        status === 'ahead'
                          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300'
                          : status === 'on-track'
                          ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-300'
                          : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 hover:border-red-300'
                      }`}
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 ${
                        status === 'ahead' ? 'bg-green-500' :
                        status === 'on-track' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}></div>

                      {advertiser.logo_svg ? (
                        <div className="mb-5 h-12 flex items-center">
                          <div
                            className="h-12 transition-transform duration-300 group-hover:scale-105"
                            dangerouslySetInnerHTML={{
                              __html: advertiser.logo_svg.replace(
                                /<svg/,
                                '<svg style="height: 48px; width: auto;"'
                              )
                            }}
                          />
                        </div>
                      ) : logoPath ? (
                        <div className="mb-5 h-12 flex items-center">
                          <img
                            src={logoPath}
                            alt={advertiser.name}
                            className="h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="mb-5 h-12 flex items-center">
                          <span className="text-lg font-bold text-slate-700">{advertiser.name}</span>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Réel</p>
                          <p className="text-3xl font-extrabold text-blue-600">
                            {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(actualH2549)}
                          </p>
                        </div>

                        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimé</p>
                          <p className="text-2xl font-bold text-slate-700">
                            {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(estimatedH2549)}
                          </p>
                        </div>

                        <div className={`rounded-lg p-4 ${
                          status === 'ahead' ? 'bg-green-100' :
                          status === 'on-track' ? 'bg-orange-100' :
                          'bg-red-100'
                        }`}>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Delivery</p>
                          <p className={`text-2xl font-extrabold ${
                            status === 'ahead' ? 'text-green-700' :
                            status === 'on-track' ? 'text-orange-700' :
                            'text-red-700'
                          }`}>
                            {(delivery || 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderAdvertiserView = () => (
    <div className="space-y-6">
      {advertisers.map(advertiser => {
        const advertiserDeviceIds = advertiserDevices
          .filter(ad => ad.advertiser_id === advertiser.id)
          .map(ad => ad.device_id);

        const advertiserDevicesList = devices.filter(d => advertiserDeviceIds.includes(d.id));

        if (advertiserDevicesList.length === 0) return null;

        const logoPath = getLogoPath(advertiser.name);

        return (
          <div key={advertiser.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {advertiser.logo_svg ? (
                  <div
                    className="w-12 h-12 flex items-center"
                    dangerouslySetInnerHTML={{
                      __html: advertiser.logo_svg.replace(
                        /<svg/,
                        '<svg style="height: 48px; width: auto;"'
                      )
                    }}
                  />
                ) : logoPath ? (
                  <img
                    src={logoPath}
                    alt={advertiser.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-600">{advertiser.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{advertiser.name}</h2>
                  <p className="text-sm text-slate-600">Performance par Dispositif - Cible H25-49</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {advertiserDevicesList.map(device => {
                  const deviceProgramIds = devicePrograms
                    .filter(dp => dp.device_id === device.id)
                    .map(dp => dp.program_id);

                  const deviceEstimatedData = estimatedData.filter(d =>
                    d.device_id === device.id &&
                    d.advertiser_id === advertiser.id &&
                    (d.program_id === null || deviceProgramIds.includes(d.program_id))
                  );

                  const filteredActualData = filterActualDataByDevice(
                    actualData.filter(ad => ad.advertiser_id === advertiser.id),
                    deviceProgramIds
                  );

                  const performances = calculateTargetPerformances(
                    deviceEstimatedData,
                    filteredActualData,
                    targets,
                    advertiser.id,
                    cutoffDate,
                    true
                  );

                  const h2549Perf = performances.find(p =>
                    p.target_name === 'H25-49' ||
                    p.target_name === 'Hommes 25-49' ||
                    (p.target_name.includes('25-49') && (p.target_name.includes('Homme') || p.target_name.startsWith('H')))
                  );

                  const estimatedH2549 = h2549Perf?.estimated || 0;
                  const actualH2549 = h2549Perf?.actual || 0;
                  const delivery = h2549Perf?.delivery_rate || 0;
                  const status = h2549Perf?.status || 'behind';

                  return (
                    <div
                      key={device.id}
                      className={`group relative rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                        status === 'ahead'
                          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 hover:border-green-300'
                          : status === 'on-track'
                          ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-300'
                          : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 hover:border-red-300'
                      }`}
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 ${
                        status === 'ahead' ? 'bg-green-500' :
                        status === 'on-track' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}></div>

                      <div className="mb-5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                          <Tv className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-slate-700">{device.name}</span>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Réel</p>
                          <p className="text-3xl font-extrabold text-blue-600">
                            {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(actualH2549)}
                          </p>
                        </div>

                        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimé</p>
                          <p className="text-2xl font-bold text-slate-700">
                            {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(estimatedH2549)}
                          </p>
                        </div>

                        <div className={`rounded-lg p-4 ${
                          status === 'ahead' ? 'bg-green-100' :
                          status === 'on-track' ? 'bg-orange-100' :
                          'bg-red-100'
                        }`}>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Delivery</p>
                          <p className={`text-2xl font-extrabold ${
                            status === 'ahead' ? 'text-green-700' :
                            status === 'on-track' ? 'text-orange-700' :
                            'text-red-700'
                          }`}>
                            {(delivery || 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      {viewMode === 'device' ? renderDeviceView() : renderAdvertiserView()}
    </div>
  );
}

export function GlobalViewModeButtons({
  viewMode,
  onViewModeChange
}: {
  viewMode: 'device' | 'advertiser';
  onViewModeChange: (mode: 'device' | 'advertiser') => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onViewModeChange('device')}
        className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
          viewMode === 'device'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
      >
        Vue par dispositif
      </button>
      <button
        onClick={() => onViewModeChange('advertiser')}
        className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
          viewMode === 'advertiser'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
      >
        Vue par Annonceur
      </button>
    </div>
  );
}
