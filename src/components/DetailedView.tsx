import { useEffect, useState } from 'react';
import { Search, Download, Filter, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EstimatedData, ActualData, Target, Advertiser, Device, Product } from '../types';
import { formatDate } from '../utils/dateUtils';
import { useCutoffDate } from '../contexts/CutoffContext';

export default function DetailedView() {
  const [estimatedData, setEstimatedData] = useState<EstimatedData[]>([]);
  const [actualData, setActualData] = useState<ActualData[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'estimated' | 'actual'>('actual');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { selectedDeviceId, setSelectedDeviceId } = useCutoffDate();

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
      const [estimatedRes, actualRes, targetsRes, advertisersRes, devicesRes, productsRes] = await Promise.all([
        supabase.from('estimated_data').select('*').order('date_transposed', { ascending: false }),
        supabase.from('actual_data').select('*').order('date', { ascending: false }),
        supabase.from('targets').select('*').order('column_index'),
        supabase.from('advertisers').select('*'),
        supabase.from('devices').select('*').order('name'),
        supabase.from('products').select('*')
      ]);

      setEstimatedData(estimatedRes.data || []);
      setActualData(actualRes.data || []);
      setTargets(targetsRes.data || []);
      setAdvertisers(advertisersRes.data || []);
      setDevices(devicesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEstimatedData = estimatedData.filter(d => {
    if (selectedAdvertiser && d.advertiser_id !== selectedAdvertiser) return false;
    if (selectedDeviceId && d.device_id !== selectedDeviceId) return false;
    if (searchTerm && !formatDate(d.date_transposed).includes(searchTerm)) return false;
    return true;
  });

  const filteredActualData = actualData.filter(d => {
    if (selectedAdvertiser && d.advertiser_id !== selectedAdvertiser) return false;
    if (searchTerm && !formatDate(d.date).includes(searchTerm)) return false;
    return true;
  });

  const exportToCSV = () => {
    const data = viewMode === 'estimated' ? filteredEstimatedData : filteredActualData;
    const headers = viewMode === 'estimated'
      ? ['Date 2025', 'Date Transposée', 'Annonceur', ...targets.map(t => t.name)]
      : ['Date', 'Annonceur', 'Produit', ...targets.map(t => t.name)];

    const rows = data.map(d => {
      const advertiser = advertisers.find(a => a.id === d.advertiser_id);
      const product = products.find(p => p.id === (d as ActualData).product_id);
      const row = viewMode === 'estimated'
        ? [
            (d as EstimatedData).date_2025,
            (d as EstimatedData).date_transposed,
            advertiser?.name || ''
          ]
        : [
            (d as ActualData).date,
            advertiser?.name || '',
            product?.name || ''
          ];

      targets.forEach(target => {
        row.push(String(d.target_performances[target.id] || 0));
      });

      return row;
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tv-campaign-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentData = viewMode === 'estimated' ? filteredEstimatedData : filteredActualData;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Tableau Détaillé</h2>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('estimated')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'estimated'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Données Estimées
            </button>
            <button
              onClick={() => setViewMode('actual')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'actual'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Données Réelles
            </button>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                {viewMode === 'estimated' ? (
                  <>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date 2025
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      Date Transposée
                    </th>
                  </>
                ) : (
                  <th className="text-left py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date Réelle
                    </div>
                  </th>
                )}
                <th className="text-left py-3 px-4 font-semibold text-slate-900">Annonceur</th>
                {viewMode === 'actual' && (
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Produit</th>
                )}
                {targets.slice(0, 5).map(target => (
                  <th key={target.id} className="text-right py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {target.name}
                  </th>
                ))}
                <th className="text-right py-3 px-4 font-semibold text-slate-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 100).map((d, index) => {
                const advertiser = advertisers.find(a => a.id === d.advertiser_id);
                const product = products.find(p => p.id === (d as ActualData).product_id);
                const total = Object.values(d.target_performances).reduce((sum: number, val) => sum + (val as number), 0);

                return (
                  <tr key={d.id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`}>
                    {viewMode === 'estimated' ? (
                      <>
                        <td className="py-3 px-4 text-slate-900 whitespace-nowrap">
                          {formatDate((d as EstimatedData).date_2025)}
                        </td>
                        <td className="py-3 px-4 text-slate-900 whitespace-nowrap">
                          {formatDate((d as EstimatedData).date_transposed)}
                        </td>
                      </>
                    ) : (
                      <td className="py-3 px-4 text-slate-900 whitespace-nowrap">
                        {formatDate((d as ActualData).date)}
                      </td>
                    )}
                    <td className="py-3 px-4 font-medium text-slate-900">{advertiser?.name || 'N/A'}</td>
                    {viewMode === 'actual' && (
                      <td className="py-3 px-4 text-slate-700 text-sm">{product?.name || '-'}</td>
                    )}
                    {targets.slice(0, 5).map(target => (
                      <td key={target.id} className="py-3 px-4 text-right text-slate-700">
                        {new Intl.NumberFormat('fr-FR').format(d.target_performances[target.id] || 0)}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {new Intl.NumberFormat('fr-FR').format(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {currentData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">Aucune donnée à afficher</p>
            <p className="text-sm text-slate-500 mt-2">
              Importez des fichiers depuis la section "Import des données"
            </p>
          </div>
        )}

        {currentData.length > 100 && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
            <p className="text-sm text-slate-600">
              Affichage de 100 lignes sur {currentData.length} au total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
