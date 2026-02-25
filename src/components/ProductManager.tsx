import { useEffect, useState } from 'react';
import { Package, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Advertiser, Product, ActualData } from '../types';

interface AdvertiserWithProducts extends Advertiser {
  products: Product[];
}

export default function ProductManager() {
  const [advertisers, setAdvertisers] = useState<AdvertiserWithProducts[]>([]);
  const [newProductName, setNewProductName] = useState<Record<string, string>>({});
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [expandedAdvertiser, setExpandedAdvertiser] = useState<string | null>(null);
  const [showAvailableProducts, setShowAvailableProducts] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [advertisersRes, productsRes, actualDataRes] = await Promise.all([
        supabase.from('advertisers').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('actual_data').select('product_id').not('product_id', 'is', null)
      ]);

      const allAdvertisers = advertisersRes.data || [];
      const allProducts = productsRes.data || [];
      const actualDataWithProducts = (actualDataRes.data as Array<{ product_id: string }>) || [];

      const uniqueProductIds = [...new Set(actualDataWithProducts.map(d => d.product_id))];
      const productsInData = allProducts.filter(p => uniqueProductIds.includes(p.id));

      const advertisersWithProducts: AdvertiserWithProducts[] = allAdvertisers.map(advertiser => ({
        ...advertiser,
        products: allProducts.filter(p => p.advertiser_id === advertiser.id)
      }));

      setAdvertisers(advertisersWithProducts);
      setAvailableProducts(productsInData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (advertiserId: string, productName: string) => {
    if (!productName.trim()) return;

    try {
      await supabase.from('products').insert({
        advertiser_id: advertiserId,
        name: productName.trim()
      });
      setNewProductName(prev => ({
        ...prev,
        [advertiserId]: ''
      }));
      loadData();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const quickAddProduct = async (advertiserId: string, product: Product) => {
    if (advertisers.find(a => a.id === advertiserId)?.products.some(p => p.id === product.id)) {
      alert('Ce produit est déjà assigné à cet annonceur');
      return;
    }

    try {
      await supabase.from('products').insert({
        advertiser_id: advertiserId,
        name: product.name
      });
      loadData();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }

    try {
      await supabase.from('products').delete().eq('id', productId);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
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
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-amber-600" />
          <h2 className="text-xl font-bold text-slate-900">Gestion des Produits</h2>
        </div>
        <button
          onClick={() => setShowAvailableProducts(!showAvailableProducts)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {availableProducts.length} produit{availableProducts.length !== 1 ? 's' : ''} dans les données
        </button>
      </div>

      {showAvailableProducts && availableProducts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="text-sm font-semibold text-amber-900 mb-3">Produits détectés dans les données réelles:</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableProducts.map(product => {
              const advertiser = advertisers.find(a => a.id === product.advertiser_id);
              const isAlreadyAssigned = advertiser?.products.some(p => p.id === product.id);
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 bg-white rounded border border-amber-100"
                >
                  <div className="text-sm">
                    <span className="font-medium text-slate-900">{product.name}</span>
                    <span className="text-slate-500 text-xs ml-2">(assigné à {advertiser?.name})</span>
                  </div>
                  <div className="flex gap-1">
                    {advertisers.filter(a => a.id !== product.advertiser_id).map(advertiser => (
                      <button
                        key={advertiser.id}
                        onClick={() => quickAddProduct(advertiser.id, product)}
                        disabled={advertiser.products.some(p => p.id === product.id)}
                        title={`Ajouter à ${advertiser.name}`}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {advertiser.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                    {advertiser.products.length} produit{advertiser.products.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </button>

            {expandedAdvertiser === advertiser.id && (
              <div className="p-4 bg-white border-t border-slate-200">
                {advertiser.products.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {advertiser.products.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                      >
                        <span className="text-sm text-slate-700 font-medium">{product.name}</span>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic mb-4">Aucun produit assigné</p>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProductName[advertiser.id] || ''}
                    onChange={(e) => setNewProductName(prev => ({
                      ...prev,
                      [advertiser.id]: e.target.value
                    }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addProduct(advertiser.id, newProductName[advertiser.id] || '');
                      }
                    }}
                    placeholder="Ex: MC DO HAPPY MEAL P#"
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => addProduct(advertiser.id, newProductName[advertiser.id] || '')}
                    disabled={!newProductName[advertiser.id]?.trim()}
                    className="px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 mt-3 p-2 bg-slate-50 rounded">
                  💡 Les intitulés de produits doivent correspondre à ceux présents dans vos fichiers bilans (colonne produit)
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
