A simple crossword generator based on `.xlsx` and `.csv` files

Assumptions of `xlsx`:

- The file name is the category name
- The sheet name is the subcategory name
- The first column is the term
- The second column is the definition

Place files formatted this way

- xlsx file in the `/public/bases` directory
- csv files as the `/public/csv/[base]/[subcategory].csv` (`xlsx` files are transformatted to `csv`)

To generate the `/public/bases.json` file, run `npm run build`


<!-- Security scan triggered at 2026-08-31 16:21:41 -->

<!-- Security scan triggered at 2026-08-31 16:25:22 -->

<!-- Security scan triggered at 2026-08-31 18:15:15 -->

<!-- Security scan triggered at 2026-09-02 06:31:06 -->