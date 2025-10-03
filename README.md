A simple crossword generator based on .xlsx files

Assumptions:
- The file name is the category name
- The sheet name is the subcategory name
- The first column is the term
- The second column is the definition

Place files formatted this way in the `/public/bases` directory

To generate the `/public/bases.json` file, run `npm run build`
