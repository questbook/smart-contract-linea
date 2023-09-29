import React from "react";

export type SemaphoreContextType = {
  _users: string[];
  refreshUsers: () => Promise<void>;
};

export default React.createContext<SemaphoreContextType>({
  _users: [],
  refreshUsers: () => Promise.resolve(),
});
