/**
 * Page: AdminSettingsPage (Paramètres)
 * Configuration: seuil auto-suspension, gestion admins, modèles d'emails
 */
import React, { useState } from "react";
import { Save, Plus, Trash2, Edit, AlertTriangle } from "lucide-react";
import {
  DEFAULT_AUTO_SUSPEND_THRESHOLD,
  MOCK_ADMINS,
  MOCK_EMAIL_TEMPLATES,
  formatDateFrench,
} from "../mockDataFrench";

export default function AdminSettingsPageNew() {
  const [autoSuspendThreshold, setAutoSuspendThreshold] = useState(
    DEFAULT_AUTO_SUSPEND_THRESHOLD,
  );

  const handleSaveThreshold = () => {
    // TODO: POST /api/admin/settings/auto-suspend-threshold
    alert(`Seuil enregistré: ${autoSuspendThreshold} signalements`);
  };

  const handleAddAdmin = () => {
    // TODO: POST /api/admin/add-admin
    const email = prompt("Email du nouvel administrateur :");
    if (email) {
      alert(`Invitation envoyée à ${email} - À implémenter`);
    }
  };

  const handleDeleteAdmin = (adminId, adminName) => {
    // TODO: DELETE /api/admin/:id
    if (confirm(`Supprimer l'administrateur "${adminName}" ?`)) {
      alert(`Suppression de ${adminName} - À implémenter`);
    }
  };

  const handleEditTemplate = (template) => {
    // TODO: Open modal to edit email template
    alert(`Éditer le modèle "${template.name}" - À implémenter`);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Auto-suspension rule */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Règle d'auto-suspension
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Définissez le nombre de signalements ouverts qui déclenchent
          automatiquement la suspension d'un restaurant.
        </p>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Suspendre automatiquement après
          </label>
          <select
            value={autoSuspendThreshold}
            onChange={(e) => setAutoSuspendThreshold(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} signalement{n > 1 ? "s" : ""} ouvert{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveThreshold}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>

        {autoSuspendThreshold === 1 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">
              <strong>Attention :</strong> un seul signalement suffira à
              suspendre un compte.
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Admin management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Gestion des administrateurs
          </h2>
          <button
            onClick={handleAddAdmin}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter un admin
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Date ajout
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Dernière connexion
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MOCK_ADMINS.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-800">
                      {admin.nom}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{admin.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {new Date(admin.dateAjout).toLocaleDateString("fr-FR")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {new Date(admin.derniereConnexion).toLocaleDateString(
                        "fr-FR",
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteAdmin(admin.id, admin.nom)}
                      className="text-red-600 hover:text-red-700 p-1"
                      disabled={admin.id === "adm-001"}
                      title={
                        admin.id === "adm-001"
                          ? "Admin principal (non supprimable)"
                          : "Supprimer"
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Email templates */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Modèles d'emails
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Personnalisez les emails envoyés automatiquement aux restaurants.
          Utilisez les variables indiquées pour insérer des données dynamiques.
        </p>

        <div className="space-y-3">
          {MOCK_EMAIL_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-800 text-sm">
                  {template.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Variables: {template.variables.join(", ")}
                </p>
              </div>
              <button
                onClick={() => handleEditTemplate(template)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:text-green-700 font-medium border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Global stats (read-only) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Statistiques globales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Restaurants inscrits (total)
            </p>
            <p className="text-2xl font-bold text-gray-800 mt-1">18</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Receveurs inscrits (total)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">8</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Donations publiées (total)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">32</p>
          </div>
        </div>
      </div>
    </div>
  );
}
