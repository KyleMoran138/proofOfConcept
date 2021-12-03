interface PagedDataResponse<T = unknown>{
  count: number,
  next: unknown,
  previous: unknown,
  results: T[]
}

export default PagedDataResponse;