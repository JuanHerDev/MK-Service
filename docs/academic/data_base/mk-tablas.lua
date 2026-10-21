-- mk-tablas.lua
-- Tablas con encabezado azul (#1F4E79), bordes grises y leyenda en cursiva DEBAJO de la tabla.
-- Solo actúa cuando el destino es LaTeX/PDF.

local function tex(blocks)
  local s = pandoc.write(pandoc.Pandoc(blocks), 'latex')
  s = s:gsub('%s+$', ''):gsub('\n\n+', ' \\par ')
  return s
end

local function plain_len(blocks)
  return #pandoc.utils.stringify(blocks)
end

function Table(tbl)
  if not FORMAT:match('latex') then return nil end

  local ncols = #tbl.colspecs
  local maxlen = {}
  for j = 1, ncols do maxlen[j] = 4 end

  local function scan(rows)
    for _, row in ipairs(rows) do
      for j, cell in ipairs(row.cells) do
        local l = plain_len(cell.contents)
        if l > maxlen[j] then maxlen[j] = l end
      end
    end
  end
  scan(tbl.head.rows)
  for _, b in ipairs(tbl.bodies) do scan(b.body) end

  -- Pesos: raíz cuadrada del texto más largo, acotada, para repartir el ancho.
  local weights, total = {}, 0
  for j = 1, ncols do
    local w = math.sqrt(math.max(6, math.min(maxlen[j], 140)))
    weights[j] = w
    total = total + w
  end

  local cols = {}
  for j = 1, ncols do
    local per_mille = math.floor(weights[j] / total * 1000)
    cols[#cols + 1] = string.format(
      '>{\\raggedright\\arraybackslash}p{\\dimexpr(\\linewidth-%d\\tabcolsep-%d\\arrayrulewidth)*%d/1000\\relax}',
      2 * ncols, ncols + 1, per_mille)
  end

  local function row_tex(row, header)
    local cells = {}
    for _, cell in ipairs(row.cells) do
      local c = tex(cell.contents)
      if header then c = '\\textcolor{white}{\\textbf{' .. c .. '}}' end
      cells[#cells + 1] = c
    end
    local prefix = header and '\\rowcolor{mkblue}' or ''
    return prefix .. table.concat(cells, ' & ') .. ' \\\\ \\hline'
  end

  local head = {}
  for _, row in ipairs(tbl.head.rows) do head[#head + 1] = row_tex(row, true) end
  local head_tex = table.concat(head, '\n')

  local out = {}
  out[#out + 1] = '\\begingroup\\small\\renewcommand{\\arraystretch}{1.25}\\arrayrulecolor{mkline}'
  out[#out + 1] = '\\begin{longtable}{|' .. table.concat(cols, '|') .. '|}'
  out[#out + 1] = '\\hline'
  out[#out + 1] = head_tex
  out[#out + 1] = '\\endfirsthead'
  out[#out + 1] = '\\hline'
  out[#out + 1] = head_tex
  out[#out + 1] = '\\endhead'
  for _, b in ipairs(tbl.bodies) do
    for _, row in ipairs(b.body) do out[#out + 1] = row_tex(row, false) end
  end
  out[#out + 1] = '\\end{longtable}\\endgroup'

  local blocks = { pandoc.RawBlock('latex', table.concat(out, '\n')) }

  if #tbl.caption.long > 0 then
    local cap = tex(tbl.caption.long)
    blocks[#blocks + 1] = pandoc.RawBlock('latex',
      '\\begin{center}\\vspace{-6pt}{\\footnotesize\\itshape ' .. cap .. '}\\end{center}')
  end
  return blocks
end