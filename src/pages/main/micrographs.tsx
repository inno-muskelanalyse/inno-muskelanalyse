import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { PortableMicrograph } from "../../../src-tauri/bindings/PortableMicrograph"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EmptyState from "../../components/micrographs/EmptyState";
import { Tab } from "@headlessui/react";
import List from "../../components/micrographs/List";
import clsx from "clsx";
import { Import, LayoutGrid, LayoutList, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useEffect } from "react";
import Grid from "../../components/micrographs/Grid";

const MicrographsPage = () => {
    const queryClient = useQueryClient();

    const { data, refetch, isLoading } = useQuery({
        queryKey: ["micrographs"],
        queryFn: micrographFetcher
    });

    useEffect(() => {
        const unlisten = listen("UPDATE_MICROGRAPHS", () => refetch());

        return () => {
            unlisten.then((f) => f());
        }
    }, [refetch]);

    const { mutate: mutate_import } = useMutation({
        mutationKey: ["import_micrographs"],
        mutationFn: importMicrographs,
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries({
                queryKey: ["queue_status"]
            });
        }
    });

    const { mutate: mutate_delete } = useMutation({
        mutationKey: ["delete_micrograph"],
        mutationFn: deleteMicrograph,
        onSuccess: () => {
            refetch();
        }
    });

    const { mutate: mutate_export } = useMutation({
        mutationKey: ["export_micrograph"],
        mutationFn: exportMicrograph
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 text-gray-600 animate-spin" />
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex justify-center items-center h-full">
                <EmptyState onImport={mutate_import} />
            </div>
        )
    }

    return (
        <Tab.Group>
            <Tab.List className="flex justify-between">
                <div>
                    <Button variant={"secondary"} onClick={() => mutate_import()}><Import className="mr-2 h-4 w-4" />Import Micrograph</Button>
                </div>
                <div>
                    <Tab>{({ selected }) => (<TabItem {...{ selected }}><LayoutList className="h-4" /></TabItem>)}</Tab>
                    <Tab>{({ selected }) => (<TabItem {...{ selected }}><LayoutGrid className="h-4" /></TabItem>)}</Tab>
                </div>
            </Tab.List>
            <Tab.Panels className={"mt-4"}>
                <Tab.Panel><List micrographs={data} onDelete={mutate_delete} onExport={mutate_export} /></Tab.Panel>
                <Tab.Panel><Grid micrographs={data} onDelete={mutate_delete} onExport={mutate_export} /></Tab.Panel>
            </Tab.Panels>
        </Tab.Group>
    )
}

type TabProps = {
    children: React.ReactNode,
    selected: boolean
}

const TabItem = ({ children, selected }: TabProps) => {
    return (
        <div className={clsx(selected && "bg-gray-100", "text-gray-600 rounded-md px-2 py-2 text-sm font-medium")}>
            {children}
        </div>
    )
}

const micrographFetcher = async () => {
    return invoke("get_micrographs").then((res) => {
        return res as PortableMicrograph[]
    })
}

const importMicrographs = async () => {
    const dialog = await import("@tauri-apps/api/dialog");

    const result = await dialog.open({
        filters: [{
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "tiff", "tif", "bmp"]
        }],
        multiple: true
    })

    if (!result) {
        return
    }

    return invoke("import_micrographs", { files: result })
}

const deleteMicrograph = async (uuid: string) => {
    const dialog = await import("@tauri-apps/api/dialog");

    const result = await dialog.confirm("Are you sure you want to delete this micrograph?", {
        title: "Delete Micrograph",
        type: "warning",
        cancelLabel: "Cancel",
        okLabel: "Delete"
    });

    if (!result) {
        return
    }

    return invoke("delete_micrograph", { id: uuid })
}

const exportMicrograph = async (uuid: string) => {
    const dialog = await import("@tauri-apps/api/dialog");

    const result = await dialog.save({
        filters: [{
            name: "CSV",
            extensions: ["csv"]
        }],
        defaultPath: uuid
    })

    if (!result) {
        return
    }

    return invoke("export_csv", { micrographId: uuid, path: result })
}

export default MicrographsPage;