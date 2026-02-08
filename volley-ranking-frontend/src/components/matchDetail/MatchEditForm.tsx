type MatchFormData = {
  cantidadEquipos: number;
  cantidadSuplentes: number;
  formacion: string;
  horaInicio: string;
};

type MatchEditFormProps = {
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  formData: MatchFormData;
  setFormData: (data: MatchFormData) => void;
  formaciones: Record<string, any>;
  onSave: () => void;
  loading: boolean;
};

export default function MatchEditForm({
  editMode,
  setEditMode,
  formData,
  setFormData,
  formaciones,
  onSave,
  loading,
}: MatchEditFormProps) {
  if (!editMode) return null;

  return (
    <div className="grid gap-4">
      <input
        type="number"
        value={formData.cantidadEquipos}
        onChange={(e) =>
          setFormData({
            ...formData,
            cantidadEquipos: Number(e.target.value),
          })
        }
        className="border px-2 py-1 rounded"
        placeholder="Cantidad de equipos"
      />

      <input
        type="number"
        value={formData.cantidadSuplentes}
        onChange={(e) =>
          setFormData({
            ...formData,
            cantidadSuplentes: Number(e.target.value),
          })
        }
        className="border px-2 py-1 rounded"
        placeholder="Cantidad de suplentes"
      />

      <select
        value={formData.formacion}
        onChange={(e) =>
          setFormData({
            ...formData,
            formacion: e.target.value,
          })
        }
        className="border px-2 py-1 rounded"
      >
        {Object.keys(formaciones).map((f) => (
          <option key={f} value={f}>
            {f.replace("_", " ")}
          </option>
        ))}
      </select>

      <input
        type="datetime-local"
        value={formData.horaInicio}
        onChange={(e) =>
          setFormData({
            ...formData,
            horaInicio: e.target.value,
          })
        }
        className="border px-2 py-1 rounded"
      />

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={loading}
          className="border px-4 py-2 rounded"
        >
          Guardar
        </button>

        <button
          onClick={() => setEditMode(false)}
          className="border px-4 py-2 rounded"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
