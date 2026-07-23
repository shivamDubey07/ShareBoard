import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {

    const slug = window.location.pathname.substring(1);

    const token = localStorage.getItem(
        `owner_${slug}`
    );

    if (token) {

        config.headers["X-Owner-Token"] = token;

    }

    return config;

});

export default api;