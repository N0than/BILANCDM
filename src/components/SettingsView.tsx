import { useEffect, useState } from 'react';
import { Settings, Users, Target, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Advertiser, Target as TargetType, Device } from '../types';
import DeviceProgramsManager from './DeviceProgramsManager';
import ProductManager from './ProductManager';

interface AdvertiserWithDevices extends Advertiser {
  devices: Device[];
  targets: TargetType[];
}

interface DeviceWithGRP extends Device {
  totalGRP?: number;
}

export default function SettingsView() {
  const [advertisers, setAdvertisers] = useState<AdvertiserWithDevices[]>([]);
  const [devices, setDevices] = useState<DeviceWithGRP[]>([]);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [newAdvertiser, setNewAdvertiser] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newAdvertiserLogo, setNewAdvertiserLogo] = useState<string | null>(null);
  const [expandedAdvertiser, setExpandedAdvertiser] = useState<string | null>(null);
  const [selectedDeviceForAdvertiser, setSelectedDeviceForAdvertiser] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [advertisersRes, devicesRes, targetsRes, advertiserDevicesRes, advertiserTargetsRes, estimatedDataRes] = await Promise.all([
        supabase.from('advertisers').select('*').order('name'),
        supabase.from('devices').select('*').order('name'),
        supabase.from('targets').select('*').order('name'),
        supabase.from('advertiser_devices').select('*'),
        supabase.from('advertiser_targets').select('*'),
        supabase.from('estimated_data').select('*')
      ]);

      const allAdvertisers = advertisersRes.data || [];
      const allDevices = devicesRes.data || [];
      const allTargets = targetsRes.data || [];
      const allAdvertiserDevices = advertiserDevicesRes.data || [];
      const allAdvertiserTargets = advertiserTargetsRes.data || [];
      const allEstimatedData = estimatedDataRes.data || [];

      const devicesWithGRP: DeviceWithGRP[] = allDevices.map(device => {
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
          totalGRP
        };
      });

      const advertisersWithDevices: AdvertiserWithDevices[] = allAdvertisers.map(advertiser => ({
        ...advertiser,
        devices: allAdvertiserDevices
          .filter(ad => ad.advertiser_id === advertiser.id)
          .map(ad => devicesWithGRP.find(d => d.id === ad.device_id))
          .filter((d): d is Device => d !== undefined),
        targets: allAdvertiserTargets
          .filter(at => at.advertiser_id === advertiser.id)
          .map(at => allTargets.find(t => t.id === at.target_id))
          .filter((t): t is TargetType => t !== undefined)
      }));

      setAdvertisers(advertisersWithDevices);
      setDevices(devicesWithGRP);
      setTargets(allTargets);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAdvertiser = async () => {
    if (!newAdvertiser.trim()) return;

    try {
      await supabase.from('advertisers').insert([{
        name: newAdvertiser.trim(),
        logo_svg: newAdvertiserLogo
      }]);
      setNewAdvertiser('');
      setNewAdvertiserLogo(null);
      loadData();
    } catch (error) {
      console.error('Error adding advertiser:', error);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('svg')) {
      alert('Veuillez sélectionner un fichier SVG');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const svgContent = event.target?.result as string;
      setNewAdvertiserLogo(svgContent);
    };
    reader.readAsText(file);
  };

  const updateAdvertiserLogo = async (advertiserId: string, logoSvg: string | null) => {
    try {
      await supabase
        .from('advertisers')
        .update({ logo_svg: logoSvg })
        .eq('id', advertiserId);
      loadData();
    } catch (error) {
      console.error('Error updating advertiser logo:', error);
    }
  };

  const handleAdvertiserLogoUpload = (advertiserId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('svg')) {
      alert('Veuillez sélectionner un fichier SVG');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const svgContent = event.target?.result as string;
      updateAdvertiserLogo(advertiserId, svgContent);
    };
    reader.readAsText(file);
  };

  const addTarget = async () => {
    if (!newTarget.trim()) return;

    try {
      const maxIndex = Math.max(...targets.map(t => t.column_index), 0);
      await supabase.from('targets').insert([{
        name: newTarget.trim(),
        column_index: maxIndex + 1
      }]);
      setNewTarget('');
      loadData();
    } catch (error) {
      console.error('Error adding target:', error);
    }
  };

  const deleteAdvertiser = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet annonceur ? Toutes les données associées seront supprimées.')) {
      return;
    }

    try {
      await supabase.from('advertisers').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting advertiser:', error);
    }
  };

  const deleteTarget = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette cible ?')) {
      return;
    }

    try {
      await supabase.from('targets').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting target:', error);
    }
  };

  const addTargetToAdvertiser = async (advertiserId: string, targetId: string) => {
    if (!targetId) return;

    try {
      await supabase.from('advertiser_targets').insert({
        advertiser_id: advertiserId,
        target_id: targetId
      });
      loadData();
    } catch (error) {
      console.error('Error adding target to advertiser:', error);
    }
  };

  const removeTargetFromAdvertiser = async (advertiserId: string, targetId: string) => {
    try {
      await supabase.from('advertiser_targets')
        .delete()
        .eq('advertiser_id', advertiserId)
        .eq('target_id', targetId);
      loadData();
    } catch (error) {
      console.error('Error removing target from advertiser:', error);
    }
  };

  const addDeviceToAdvertiser = async (advertiserId: string, deviceId: string) => {
    if (!deviceId) return;

    try {
      await supabase.from('advertiser_devices').insert({
        advertiser_id: advertiserId,
        device_id: deviceId
      });

      await supabase
        .from('estimated_data')
        .update({ advertiser_id: advertiserId })
        .eq('device_id', deviceId);

      setSelectedDeviceForAdvertiser(prev => ({
        ...prev,
        [advertiserId]: ''
      }));
      loadData();
    } catch (error) {
      console.error('Error adding device to advertiser:', error);
    }
  };

  const removeDeviceFromAdvertiser = async (advertiserId: string, deviceId: string) => {
    try {
      await supabase.from('advertiser_devices')
        .delete()
        .eq('advertiser_id', advertiserId)
        .eq('device_id', deviceId);

      await supabase
        .from('estimated_data')
        .update({ advertiser_id: null })
        .eq('device_id', deviceId)
        .eq('advertiser_id', advertiserId);

      loadData();
    } catch (error) {
      console.error('Error removing device from advertiser:', error);
    }
  };

  const clearAllData = async () => {
    if (!confirm('ATTENTION : Cela supprimera toutes les données estimées et réelles. Cette action est irréversible. Continuer ?')) {
      return;
    }

    try {
      await Promise.all([
        supabase.from('estimated_data').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('actual_data').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
      alert('Toutes les données ont été supprimées avec succès');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Erreur lors de la suppression des données');
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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
            <p className="text-slate-300">
              Configuration des annonceurs, cibles et gestion des données
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">Annonceurs et Dispositifs</h2>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newAdvertiser}
              onChange={(e) => setNewAdvertiser(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAdvertiser()}
              placeholder="Nom de l'annonceur"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addAdvertiser}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <label className="flex-1 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="file"
                accept=".svg"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <span className="text-sm text-slate-600">
                {newAdvertiserLogo ? '✓ Logo SVG sélectionné' : 'Ajouter un logo SVG (optionnel)'}
              </span>
            </label>
            {newAdvertiserLogo && (
              <button
                onClick={() => setNewAdvertiserLogo(null)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {advertisers.map(advertiser => (
            <div key={advertiser.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedAdvertiser(expandedAdvertiser === advertiser.id ? null : advertiser.id)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedAdvertiser === advertiser.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  )}
                  <div className="text-left">
                    <div className="font-medium text-slate-900">{advertiser.name}</div>
                    <div className="text-xs text-slate-600">
                      {advertiser.devices.length} dispositif{advertiser.devices.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAdvertiser(advertiser.id);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </button>

              {expandedAdvertiser === advertiser.id && (
                <div className="p-4 bg-white border-t border-slate-200">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Logo</h4>
                    <div className="flex items-center gap-3">
                      {advertiser.logo_svg ? (
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center p-2"
                            dangerouslySetInnerHTML={{ __html: advertiser.logo_svg }}
                          />
                          <div className="flex gap-2">
                            <label className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                              <input
                                type="file"
                                accept=".svg"
                                onChange={(e) => handleAdvertiserLogoUpload(advertiser.id, e)}
                                className="hidden"
                              />
                              Modifier
                            </label>
                            <button
                              onClick={() => updateAdvertiserLogo(advertiser.id, null)}
                              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex-1 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                          <input
                            type="file"
                            accept=".svg"
                            onChange={(e) => handleAdvertiserLogoUpload(advertiser.id, e)}
                            className="hidden"
                          />
                          <span className="text-sm text-slate-600">Ajouter un logo SVG</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Dispositifs assignés</h4>
                    {advertiser.devices.length > 0 ? (
                      <div className="space-y-2">
                        {advertiser.devices.map(device => (
                          <div
                            key={device.id}
                            className="flex items-center justify-between p-2 bg-blue-50 rounded"
                          >
                            <span className="text-sm text-slate-700">
                              {device.name} - {(device as DeviceWithGRP).totalGRP?.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} GRP
                            </span>
                            <button
                              onClick={() => removeDeviceFromAdvertiser(advertiser.id, device.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Aucun dispositif assigné</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={selectedDeviceForAdvertiser[advertiser.id] || ''}
                      onChange={(e) => setSelectedDeviceForAdvertiser(prev => ({
                        ...prev,
                        [advertiser.id]: e.target.value
                      }))}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Ajouter un dispositif...</option>
                      {devices
                        .filter(d => !advertiser.devices.some(ad => ad.id === d.id))
                        .map(device => (
                          <option key={device.id} value={device.id}>
                            {device.name} - {(device as DeviceWithGRP).totalGRP?.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} GRP
                          </option>
                        ))
                      }
                    </select>
                    <button
                      onClick={() => addDeviceToAdvertiser(advertiser.id, selectedDeviceForAdvertiser[advertiser.id] || '')}
                      disabled={!selectedDeviceForAdvertiser[advertiser.id]}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Cibles assignées</h4>
                    {advertiser.targets.length > 0 ? (
                      <div className="space-y-2">
                        {advertiser.targets.map(target => (
                          <div
                            key={target.id}
                            className="flex items-center justify-between p-2 bg-green-50 rounded"
                          >
                            <span className="text-sm text-slate-700">{target.name}</span>
                            <button
                              onClick={() => removeTargetFromAdvertiser(advertiser.id, target.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Aucune cible assignée</p>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      onChange={(e) => {
                        if (e.target.value) {
                          addTargetToAdvertiser(advertiser.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Ajouter une cible...</option>
                      {targets
                        .filter(t => !advertiser.targets.some(at => at.id === t.id))
                        .map(target => (
                          <option key={target.id} value={target.id}>
                            {target.name}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ProductManager />

      <DeviceProgramsManager />

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-slate-900">Cibles</h2>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTarget()}
            placeholder="Nom de la cible"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={addTarget}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {targets.map(target => (
            <div
              key={target.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="font-medium text-slate-900">{target.name}</span>
              <button
                onClick={() => deleteTarget(target.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Gestion des Données</h2>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-semibold text-red-900 mb-2">Zone Dangereuse</h3>
            <p className="text-sm text-red-700 mb-4">
              Les actions ci-dessous sont irréversibles. Assurez-vous d'avoir des sauvegardes avant de continuer.
            </p>
            <button
              onClick={clearAllData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer toutes les données
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Informations</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Les dispositifs sont créés automatiquement lors de l'import (un par onglet Excel)</li>
              <li>• Assignez les dispositifs aux annonceurs dans cette section</li>
              <li>• Les annonceurs sont liés aux produits via le mapping automatique</li>
              <li>• Les cibles sont utilisées pour calculer les performances</li>
              <li>• La suppression d'un annonceur supprime toutes ses données associées</li>
              <li>• Les données peuvent être réimportées à tout moment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
