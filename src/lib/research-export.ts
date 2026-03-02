interface ExportUser {
  id: string
  email: string
}

interface ExportPatient {
  id: string
  displayName: string
  user: ExportUser
  mealLogs: unknown[]
  symptomLogs: unknown[]
  contextLogs: unknown[]
  waterLogs: unknown[]
  medicationLogs: unknown[]
}

interface ExportPayload {
  generatedAt: string
  deidentified: boolean
  patients: ExportPatient[]
}

function maskPatient(index: number): { id: string; displayName: string; email: string } {
  const serial = String(index + 1).padStart(3, '0')
  return {
    id: `PATIENT_${serial}`,
    displayName: `Participant ${serial}`,
    email: `participant_${serial}@masked.local`,
  }
}

export function buildResearchExport(
  patients: ExportPatient[],
  options: { deidentify: boolean }
): ExportPayload {
  if (!options.deidentify) {
    return {
      generatedAt: new Date().toISOString(),
      deidentified: false,
      patients,
    }
  }

  const maskedPatients = patients.map((p, idx) => {
    const masked = maskPatient(idx)
    return {
      ...p,
      id: masked.id,
      displayName: masked.displayName,
      user: {
        id: masked.id,
        email: masked.email,
      },
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    deidentified: true,
    patients: maskedPatients,
  }
}
