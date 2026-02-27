
// -------------------
// Edit de un Match
// -------------------

import { ActionButton } from "../ui/action/ActionButton";

type MatchFormData = {
  cantidadEquipos: number;
  cantidadSuplentes: number;
  formacion: string;
  horaInicio: string;
  visibility: "group_only" | "public";
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

  const inputBase =
    "w-full border border-neutral-300 rounded px-3 py-2 text-sm text-neutral-900 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="grid gap-6 pt-4 border-t border-neutral-200">
      {/* CAMPOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Cantidad de equipos
          </label>
          <input
            type="number"
            value={formData.cantidadEquipos}
            onChange={(e) =>
              setFormData({
                ...formData,
                cantidadEquipos: Number(e.target.value),
              })
            }
            className={inputBase}
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Cantidad de suplentes
          </label>
          <input
            type="number"
            value={formData.cantidadSuplentes}
            onChange={(e) =>
              setFormData({
                ...formData,
                cantidadSuplentes: Number(e.target.value),
              })
            }
            className={inputBase}
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Formación
          </label>
          <select
            value={formData.formacion}
            onChange={(e) =>
              setFormData({
                ...formData,
                formacion: e.target.value,
              })
            }
            className={inputBase}
          >
            {Object.keys(formaciones).map((f) => (
              <option key={f} value={f}>
                {f.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Fecha y hora
          </label>
          <input
            type="datetime-local"
            value={formData.horaInicio}
            onChange={(e) =>
              setFormData({
                ...formData,
                horaInicio: e.target.value,
              })
            }
            className={inputBase}
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Visibilidad
          </label>
          <select
            value={formData.visibility}
            onChange={(e) =>
              setFormData({
                ...formData,
                visibility: e.target.value as "group_only" | "public",
              })
            }
            className={inputBase}
          >
            <option value="group_only">Solo grupo</option>
            <option value="public">Público</option>
          </select>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex gap-3">
        <ActionButton
          onClick={onSave}
          loading={loading}
          variant="primary"
        >
          Guardar
        </ActionButton>

        <ActionButton
          onClick={() => setEditMode(false)}
          variant="secondary"
        >
          Cancelar
        </ActionButton>
      </div>
    </div>
  );
}

