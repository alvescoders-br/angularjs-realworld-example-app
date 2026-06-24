export type User = {
  email: string;
  token: string;
  username: string;
  bio: string | null;
  image: string | null;
};

export type UserEnvelope = {
  user: User;
};

export type AuthCredentials = {
  email: string;
  password: string;
  username?: string;
};

export type AuthMode = 'login' | 'register';

export type UserUpdate = Partial<Omit<User, 'token'>> & {
  password?: string;
};
