export function DataTable({ columns, rows, empty = 'No records found' }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y-[#e2edf0] text-sm">
          <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-4 py-3 font-black">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2edf0] bg-white">
            {rows?.length ? (
              rows.map((row, index) => (
                <tr key={row.id || index} className="hover:bg-brand-50/70">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold text-stone-700">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-stone-500">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
