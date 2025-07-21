import { useState, useEffect } from 'react';
import { bridgeJsxServer } from '../services/bridgeJsxServer';
import '../styles/UserSelector.css';

export function UserSelector({ onUserSelect }) {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load users when component mounts
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        const userList = await bridgeJsxServer.getUsers();
        setUsers(userList);
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (newUsername.trim()) {
      const trimmedUsername = newUsername.trim();
      
      // Check if user already exists
      if (users.includes(trimmedUsername)) {
        alert('Este usuario ya existe');
        return;
      }
      
      // Add user to the list temporarily
      setUsers(prev => [...prev, trimmedUsername].sort());
      setNewUsername('');
      setIsCreating(false);
      onUserSelect(trimmedUsername);
    }
  };

  const refreshUsers = async () => {
    try {
      const userList = await bridgeJsxServer.getUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="user-selector">
        <h2>Cargando usuarios...</h2>
      </div>
    );
  }

  return (
    <div className="user-selector">
      <h2>Selecciona un Usuario</h2>
      
      {!isCreating ? (
        <>
          <select 
            onChange={(e) => onUserSelect(e.target.value)}
            value=""
          >
            <option value="" disabled>
              {users.length > 0 ? 'Selecciona un usuario...' : 'No hay usuarios registrados'}
            </option>
            {users.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
          
          <div className="user-actions">
            <button 
              className="create-user-btn"
              onClick={() => setIsCreating(true)}
            >
              Crear Nuevo Usuario
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleAddUser} className="create-user-form">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Nombre de usuario"
            autoFocus
          />
          <div className="form-buttons">
            <button type="submit">Crear</button>
            <button 
              type="button" 
              onClick={() => setIsCreating(false)}
              className="cancel-btn"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 