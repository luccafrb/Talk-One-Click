export function encodeConfig(formData) {
  const config = {
    business_name: formData.business_name,
    segment: formData.segment,
    goal: formData.goal,
    approach: formData.approach,
    create_sectors: formData.create_sectors,
    create_labels: formData.create_labels,
    create_chatbot: formData.create_chatbot,
  }
  return btoa(encodeURIComponent(JSON.stringify(config)))
}

export function decodeConfig(encoded) {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)))
  } catch {
    return null
  }
}
