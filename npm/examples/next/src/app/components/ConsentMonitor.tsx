"use client";
import React from "react";
import { useConsent } from "@tailjs/react";
import { DataClassification, DataPurposes } from "@tailjs/types";

export const ConsentMonitor = () => {
  const [consent, updateConsent, updating] = useConsent();
  if (!consent) {
    return <div>Loading consent...</div>;
  }
  return (
    <div>
      <div className="font-bold">Consent</div>
      <div>
        <select
          disabled={updating}
          value={consent.classification}
          className="text-black"
          onChange={(e) =>
            updateConsent((current) => ({
              ...current,
              classification: e.target.value as any,
            }))
          }
        >
          {DataClassification.levels.map(
            (level) =>
              level !== "never" && (
                <option key={level} value={level}>
                  {level}
                </option>
              )
          )}
        </select>
      </div>
      <div>
        {DataPurposes.specificNames.map((purpose) => (
          <label key={purpose} className="block">
            <input
              type="checkbox"
              disabled={updating}
              onChange={(e) =>
                updateConsent((current) => ({
                  ...current,
                  purposes: {
                    ...current.purposes,
                    [purpose]: e.target.checked,
                  },
                }))
              }
              checked={consent.purposes[purpose] === true}
            />
            {purpose}
          </label>
        ))}
      </div>
    </div>
  );
};
