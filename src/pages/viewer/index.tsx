import { useRouter } from "next/router"
import type { NextPageWithLayout } from "../_app"
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/tauri";
import { Loader2 } from "lucide-react";
import ImageViewer from "../../components/ImageViewer";
import { CachedMicrograph } from "../../../src-tauri/bindings/CachedMicrograph";
import { CachedSegment } from "../../../src-tauri/bindings/CachedSegment";
const Page: NextPageWithLayout = () => {
    const { query } = useRouter();
    const { data, isLoading } = useQuery<{ micrograph: CachedMicrograph, segments: CachedSegment[] }>({
        queryKey: ["micrograph", query.project, query.micrograph],
        queryFn: async () => ({
            micrograph: await invoke("get_micrograph", { projectId: query.project, micrographId: query.micrograph }),
            segments: await invoke("get_segments", { projectId: query.project, micrographId: query.micrograph }),
        }),
        enabled: !!query.project && !!query.micrograph,
        refetchInterval(query) {
            if (query.state.data?.micrograph.status == "Done") {
                return false;
            } else {
                return 200;
            }
        },
    });

    if (isLoading) {
        return (
            <div className="w-full h-full flex flex-col justify-center items-center gap-8">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>)
    }

    if (!data?.micrograph || !data?.segments) {
        return <div className="w-full h-full flex flex-col justify-center items-center gap-8">
            <p className="text-2xl font-bold text-white">Micrograph not found</p>
        </div>
    }

    return <ImageViewer micrograph={data?.micrograph} segments={data?.segments} />
}

Page.getLayout = (page) => {
    return (
        <div className="h-full w-full">
            {page}
        </div>
    )
}

export default Page