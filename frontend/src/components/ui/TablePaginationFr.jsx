import { TablePagination } from '@mui/material'

const ROWS_OPTIONS = [10, 25, 50, 100]

export default function TablePaginationFr({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange, rowsPerPageOptions = ROWS_OPTIONS }) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={onPageChange}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={rowsPerPageOptions}
      labelRowsPerPage="Lignes par page :"
      labelDisplayedRows={({ from, to, count: c }) => `${from}–${to} sur ${c !== -1 ? c : `plus de ${to}`}`}
      sx={{ '.MuiTablePagination-toolbar': { flexWrap: 'wrap' } }}
    />
  )
}
