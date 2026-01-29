import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { MapPicker } from '../../components/MapPicker';

interface Location {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  qrEnabled: boolean;
  isActive: boolean;
  qrTokens?: Array<{ token: string }>;
}

export function LocationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 37.9922,
    longitude: -1.1307,
    radiusMeters: 100,
    qrEnabled: true,
  });

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/locations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) =>
      api.patch(`/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowForm(false);
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });

  const { data: qrData } = useQuery<{ qrCode: string }>({
    queryKey: ['qr-code', showQR],
    queryFn: () => api.post(`/locations/${showQR}/generate-qr`, {}),
    enabled: !!showQR,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: 37.9922,
      longitude: -1.1307,
      radiusMeters: 100,
      qrEnabled: true,
    });
  };

  const handleEdit = (location: Location) => {
    setEditingId(location.id);
    setFormData({
      name: location.name,
      address: location.address || '',
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: location.radiusMeters,
      qrEnabled: location.qrEnabled,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t('locations.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('locations.title')}</h1>
          <button
            onClick={() => {
              setEditingId(null);
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('locations.addLocation')}
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingId ? t('locations.editLocation') : t('locations.addLocation')}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('locations.name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('locations.address')}
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('locations.radiusMeters')}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.radiusMeters}
                      onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <MapPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.qrEnabled}
                      onChange={(e) => setFormData({ ...formData, qrEnabled: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      {t('locations.qrEnabled')}
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setEditingId(null); }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* QR Modal */}
        {showQR && qrData && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">{t('locations.qrCode')}</h2>
              <img src={qrData.qrCode} alt="QR Code" className="w-full mb-4" />
              <p className="text-sm text-gray-600 mb-4">{t('locations.qrInstructions')}</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowQR(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  {t('common.close')}
                </button>
                <a
                  href={qrData.qrCode}
                  download={`qr-code-${showQR}.png`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {t('locations.downloadQR')}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Locations List */}
        <div className="grid gap-4">
          {locations && locations.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              <p>{t('locations.noLocations')}</p>
              <p className="text-sm mt-2">{t('locations.createFirst')}</p>
            </div>
          )}
          {locations?.map((location) => (
            <div key={location.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                  {location.address && <p className="text-sm text-gray-600 mt-1">{location.address}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                    <span>📏 {location.radiusMeters}m radius</span>
                    {location.qrEnabled && <span>✅ QR enabled</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {location.qrEnabled && (
                    <button
                      onClick={() => setShowQR(location.id)}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded"
                    >
                      {t('locations.showQR')}
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(location)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
