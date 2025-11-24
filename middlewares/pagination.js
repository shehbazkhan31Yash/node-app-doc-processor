// // pagination middleware: parse page & limit, attach req.pagination
// module.exports = (defaultLimit = 20, maxLimit = 200) => {
//   return (req, res, next) => {
//     try {
//       const rawPage = req.query.page;
//       const rawLimit = req.query.limit;

//       // parse integers safely
//       let page = Number(
//         rawPage === undefined ? defaultLimit && 1 : Number(rawPage)
//       );
//       if (!Number.isFinite(page) || page < 1) page = 1;

//       let limit = Number(
//         rawLimit === undefined ? defaultLimit : Number(rawLimit)
//       );
//       if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;

//       // enforce bounds
//       if (maxLimit && limit > maxLimit) limit = maxLimit;

//       const skip = (page - 1) * limit;

//       req.pagination = { page, limit, skip };

//       // Optional debug logging controlled by env var
//       if (process.env.DEBUG_PAGINATION === "true") {
//         // eslint-disable-next-line no-console
//         console.debug("[pagination] parsed", {
//           page,
//           limit,
//           skip,
//           query: req.query,
//         });
//       }

//       next();
//     } catch (err) {
//       // don't block requests on middleware error — fail safe to defaults
//       req.pagination = { page: 1, limit: defaultLimit, skip: 0 };
//       // eslint-disable-next-line no-console
//       console.error("[pagination] middleware error:", err);
//       next();
//     }
//   };
// };
