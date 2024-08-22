export const dynamicParams = false;

interface Params {
  id: string;
}

export async function generateStaticParams() {
  return [{ id: "10" }];
}
const Page = ({ params: { id } }: { params: Params }) => (
  <div>
    Post #{id}
    <button>OK</button>
  </div>
);

export default Page;
