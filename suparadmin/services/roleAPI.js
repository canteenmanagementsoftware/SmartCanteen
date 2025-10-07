import axios from "axios";

const API = "http://localhost:5000/api/roles";

export const getRoles = () => axios.get(API);
export const createRole = (data) => axios.post(API, data);
export const updateRole = (id, data) => axios.put(`${API}/${id}`, data);
export const deleteRole = (id) => axios.delete(`${API}/${id}`);
