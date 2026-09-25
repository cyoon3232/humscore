import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors({
  origin: 'http://localhost:5173',
}))
// hello
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    message: 'HumScore backend is running!',
  })
})
// initialized
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})