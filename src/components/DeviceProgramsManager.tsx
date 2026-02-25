import { useEffect, useState } from 'react';
import { Tv, Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Device, Program } from '../types';

interface DeviceWithPrograms extends Device {
  programs: Program[];
  totalGRP?: number;
}

interface ProgramWithGRP extends Program {
  grp?: number;
}

export default function DeviceProgramsManager() {
  const [devices, setDevices] = useState<DeviceWithPrograms[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, programsRes, deviceProgramsRes, estimatedDataRes] = await Promise.all([
        supabase.from('devices').select('*').order('name'),
        supabase.from('programs').select('*').order('name'),
        supabase.from('device_programs').select('*'),
        supabase.from('estimated_data').select('*')
      ]);

      const allDevices = devicesRes.data || [];
      const allPrograms = programsRes.data || [];
      const allDevicePrograms = deviceProgramsRes.data || [];
      const allEstimatedData = estimatedDataRes.data || [];

      const devicesWithPrograms: DeviceWithPrograms[] = allDevices.map(device => {
        const deviceEstimatedData = allEstimatedData.filter(d => d.device_id === device.id);
        const totalGRP = deviceEstimatedData.reduce((sum, d) => {
          let grpSum = 0;
          Object.entries(d.target_performances || {}).forEach(([targetId, value]) => {
            if (typeof value === 'number') {
              grpSum += value;
            }
          });
          return sum + grpSum;
        }, 0);

        return {
          ...device,
          programs: allDevicePrograms
            .filter(dp => dp.device_id === device.id)
            .map(dp => allPrograms.find(p => p.id === dp.program_id))
            .filter((p): p is Program => p !== undefined),
          totalGRP
        };
      });

      setDevices(devicesWithPrograms);
      setPrograms(allPrograms);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProgramToDevice = async (deviceId: string) => {
    const programId = selectedProgram[deviceId];
    if (!programId) return;

    try {
      const existingLink = devices
        .find(d => d.id === deviceId)
        ?.programs.find(p => p.id === programId);

      if (!existingLink) {
        await supabase.from('device_programs').insert({
          device_id: deviceId,
          program_id: programId
        });
      }

      setSelectedProgram(prev => ({ ...prev, [deviceId]: '' }));
      await loadData();
    } catch (error) {
      console.error('Error adding program:', error);
    }
  };

  const removeProgramFromDevice = async (deviceId: string, programId: string) => {
    try {
      await supabase.from('device_programs')
        .delete()
        .eq('device_id', deviceId)
        .eq('program_id', programId);

      await loadData();
    } catch (error) {
      console.error('Error removing program:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Tv className="w-6 h-6 text-amber-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dispositifs et Programmes</h2>
          <p className="text-sm text-slate-600">
            Configurez les programmes (colonne J Excel) pour chaque dispositif
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {devices.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-8">
            Aucun dispositif. Importez d'abord des donnees estimees.
          </p>
        ) : (
          devices.map(device => (
            <div key={device.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}
                className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedDevice === device.id ? (
                    <ChevronUp className="w-5 h-5 text-amber-700" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-amber-700" />
                  )}
                  <div className="text-left">
                    <div className="font-medium text-slate-900">{device.name}</div>
                    <div className="text-xs text-slate-600">
                      {device.programs.length} programme{device.programs.length !== 1 ? 's' : ''} - {device.totalGRP?.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} GRP
                    </div>
                  </div>
                </div>
              </button>

              {expandedDevice === device.id && (
                <div className="p-4 bg-white border-t border-slate-200">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Programmes associes</h4>
                    {device.programs.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {device.programs.map(program => (
                          <div
                            key={program.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm"
                          >
                            <span>{program.name}</span>
                            <button
                              onClick={() => removeProgramFromDevice(device.id, program.id)}
                              className="p-0.5 hover:bg-amber-200 rounded-full transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">
                        Aucun programme associe. Ajoutez les noms exacts de la colonne J du fichier Excel.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={selectedProgram[device.id] || ''}
                      onChange={(e) => setSelectedProgram(prev => ({
                        ...prev,
                        [device.id]: e.target.value
                      }))}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Sélectionner un programme...</option>
                      {programs
                        .filter(p => !device.programs.some(dp => dp.id === p.id))
                        .map(program => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))
                      }
                    </select>
                    <button
                      onClick={() => addProgramToDevice(device.id)}
                      disabled={!selectedProgram[device.id]}
                      className="px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-900 mb-2">Comment utiliser</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>1. Les programmes sont créés automatiquement lors de l'import des données réelles</li>
          <li>2. Sélectionnez un programme dans la liste déroulante</li>
          <li>3. Cliquez sur le bouton + pour l'associer au dispositif</li>
          <li>4. Le nombre de GRP total du dispositif est affiché à côté du nom</li>
        </ul>
      </div>
    </div>
  );
}
