// API utility for making HTTP requests

const getBaseUrl = (): string => {
  // Use relative URLs - the server serves the frontend directly
  return ''
}

export const apiCall = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${endpoint}`
  
  console.log(`🌐 API call: ${url}`)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API error response:`, errorText)
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    return response
  } catch (error) {
    console.error(`❌ API call failed for ${url}:`, error)
    throw error
  }
}

// Convenience method for JSON responses
export const apiJson = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await apiCall(endpoint, options)
  
  try {
    const data = await response.json()
    console.log(`✅ JSON parsed successfully for ${endpoint}`)
    return data
  } catch (jsonError) {
    console.error(`❌ Failed to parse JSON response:`, jsonError)
    throw new Error(`Failed to parse JSON response: ${jsonError.message}`)
  }
}

// Convenience method for POST requests
export const apiPost = async <T>(endpoint: string, data?: any): Promise<T> => {
  return apiJson<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}