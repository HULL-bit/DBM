import { useState, useEffect } from 'react'

// Pagination générique pour une liste déjà filtrée : les filtres doivent toujours s'appliquer
// sur la liste complète en amont, puis on ne découpe qu'à l'affichage (page courante).
// On revient à la page 0 dès que la taille de la liste filtrée change (nouveau filtre,
// recherche, ajout/suppression), pour éviter de se retrouver sur une page vide.
export default function usePagination(filteredLength, defaultRowsPerPage = 10) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage)

  useEffect(() => { setPage(0) }, [filteredLength])

  const handleChangePage = (_e, newPage) => setPage(newPage)
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  const paginate = (list) => list.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return { page, rowsPerPage, handleChangePage, handleChangeRowsPerPage, paginate }
}
