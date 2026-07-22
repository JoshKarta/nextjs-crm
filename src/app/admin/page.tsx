import { redirect } from "next/navigation";

const AdminPage = async () => {
  redirect("/admin/users");
};

export default AdminPage;
