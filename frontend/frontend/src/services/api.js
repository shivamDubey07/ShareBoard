import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
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