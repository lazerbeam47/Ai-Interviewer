
import { Form } from './components/form'
import { Interview } from './components/interview'
import { Result } from './components/result'
import { Routes,Route } from 'react-router-dom'
import { ToastContainer} from 'react-toastify'
function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Form />} />
        <Route path="/interview/:interviewId" element={<Interview />} />
        <Route path="/result/:interviewId" element={<Result />} />
      </Routes>
      <ToastContainer />
    </>
  )
}



export default App
