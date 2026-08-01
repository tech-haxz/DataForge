import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Hero3D from './components/Hero3D'
import ProtectedRoute from './components/ProtectedRoute'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Mentorship from './pages/Mentorship'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Watch from './pages/Watch'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminCourses from './pages/admin/AdminCourses'
import AdminVideos from './pages/admin/AdminVideos'
import AdminUsers from './pages/admin/AdminUsers'
import AdminProjects from './pages/admin/AdminProjects'
import AdminMentorship from './pages/admin/AdminMentorship'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return <ThemeProvider>
    <AuthProvider>
      <div className="min-h-screen bg-canvas text-ink transition-colors duration-300">
        <div className="site-background"><Hero3D /></div>
        <div className="site-content">
          <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:slug" element={<CourseDetail />} />
              <Route path="/mentorship" element={<Mentorship />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/watch/:id" element={<ProtectedRoute><Watch /></ProtectedRoute>} />

              <Route path="/admin" element={<ProtectedRoute staff><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminOverview />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="videos" element={<AdminVideos />} />
                <Route path="users" element={<ProtectedRoute admin><AdminUsers /></ProtectedRoute>} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="mentorship" element={<AdminMentorship />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>
    </AuthProvider>
  </ThemeProvider>
}

function NotFound() {
  return <div className="container pb-24 pt-40 text-center">
    <div className="display">404</div>
    <p className="mt-6 text-lg text-muted">That page went to a different cohort.</p>
  </div>
}
