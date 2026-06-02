import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import UserSelect from './components/UserSelect.jsx'
import Navigation from './components/Navigation.jsx'
import RecipeLibrary from './components/RecipeLibrary.jsx'
import WeeklyPlan from './components/WeeklyPlan.jsx'
import GroceryList from './components/GroceryList.jsx'
import PrepGuide from './components/PrepGuide.jsx'

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('recipe-user')) } catch { return null }
  })

  function handleSelectUser(u) {
    sessionStorage.setItem('recipe-user', JSON.stringify(u))
    setUser(u)
  }

  if (!user) {
    return <UserSelect onSelect={handleSelectUser} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/library" replace />} />
        <Route path="/library/*" element={<RecipeLibrary user={user} />} />
        <Route path="/plan" element={<WeeklyPlan user={user} />} />
        <Route path="/grocery" element={<GroceryList />} />
        <Route path="/prep" element={<PrepGuide />} />
      </Routes>
      <Navigation />
    </BrowserRouter>
  )
}
