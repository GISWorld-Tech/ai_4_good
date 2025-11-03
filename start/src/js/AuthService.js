const API_BASE_URL = "https://backend.gisworld-tech.com";
const TOKEN_ENDPOINT = `${API_BASE_URL}/api/token/`;

const API_CREDENTIALS = {
    username: "guest",
    password: "guest20252025"
};

let authToken = null;
let tokenExpiry = null;


export async function getAuthToken() {
    if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
        return authToken;
    }

    try {
        const response = await fetch(TOKEN_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(API_CREDENTIALS)
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        authToken = data.access || data.token;

        const expiryMinutes = 5;
        tokenExpiry = Date.now() + (expiryMinutes * 60 * 1000);

        console.log("Successfully authenticated");
        return authToken;
    } catch (error) {
        console.error("Error getting auth token:", error);
        throw error;
    }
}

export async function getAuthHeaders() {
    const token = await getAuthToken();
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

export function clearAuthToken() {
    authToken = null;
    tokenExpiry = null;
}