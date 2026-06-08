export interface RegisterDTO {
  email: string;
  password: string;
  role?: 'patient' | 'doctor' | 'admin';
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface RefreshDTO {
  refreshToken: string;
}
