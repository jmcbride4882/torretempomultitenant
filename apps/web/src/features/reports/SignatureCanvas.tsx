import { useRef, useState } from 'react';
import SignaturePad from 'react-signature-canvas';
import { useTranslation } from 'react-i18next';

interface SignatureCanvasProps {
  onSave: (signatureBase64: string) => void;
  onCancel?: () => void;
}

export function SignatureCanvas({ onSave, onCancel }: SignatureCanvasProps) {
  const { t } = useTranslation();
  const sigPadRef = useRef<SignaturePad>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigPadRef.current && !isEmpty) {
      const dataUrl = sigPadRef.current.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleEnd = () => {
    setIsEmpty(sigPadRef.current?.isEmpty() || false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
        <SignaturePad
          ref={sigPadRef}
          canvasProps={{
            className: 'w-full h-48 bg-white',
          }}
          onEnd={handleEnd}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          {t('reports.clearSignature')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            {t('common.cancel')}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed ml-auto"
        >
          {t('reports.submitSignature')}
        </button>
      </div>
    </div>
  );
}
