import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Chunk from "./component/chunk"
import { book_usx } from "./data";

const root = document.getElementById('chunkingComponent');
root.setAttribute("data-usx", book_usx);

ReactDOM.createRoot(document.getElementById('chunkingComponent')).render(
  <React.StrictMode>
    <Chunk />
  </React.StrictMode>,
)
