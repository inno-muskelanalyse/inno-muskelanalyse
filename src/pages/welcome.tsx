import clsx from "clsx"
import { FileClockIcon, FilePlusIcon, FileSearchIcon, LucideIcon, XIcon, Loader2 } from "lucide-react";
import packageInfo from '../../package.json';
import { invoke } from "@tauri-apps/api/tauri";
import { NextPageWithLayout } from "./_app";
import { useQuery } from "@tanstack/react-query";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import path from "path";

const { version, author, displayName, filetypeAssociation, homepage } = packageInfo;

const Welcome: NextPageWithLayout = () => {
    const [parent] = useAutoAnimate();

    const ready = useQuery<Boolean, string>({
        queryKey: ["ready"],
        queryFn: fetch_is_ready,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
    });

    const recentProject = useQuery<string, string>({
        queryKey: ["recentProject"],
        queryFn: async () => await invoke<string>("recent_project"),
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
    });



    return (
        <div className="gradient-bg h-full w-full">
            <div className={"bg-myotube h-full w-full bg-contain bg-no-repeat bg-right"} ref={parent}>
                <div data-tauri-drag-region className="h-12 px-6 w-full bg-gradient-to-r from-dark-blue/40 to-white/5 backdrop-blur-md flex items-center select-none cursor-default text-xl text-cyan-500">
                    <span data-tauri-drag-region>{displayName}</span>
                </div>
                {
                    ready.isLoading && (
                        <div className="w-full h-[80%] flex flex-col justify-center items-center gap-8">
                            <Loader2 className="h-16 w-16 animate-spin" />
                            <p>Getting ready...</p>
                        </div>
                    )
                }
                {
                    ready.isError && (
                        <div className="w-full h-[80%] flex flex-col justify-center items-center gap-8">
                            <p>Something went wrong...</p>
                            <p>{ready.error}</p>
                        </div>
                    )
                }
                {
                    ready.data && (
                        <div className="grid grid-cols-5 gap-1 py-4">
                            <Item Icon={FilePlusIcon} onClick={handle_create_project}>Create a new Project</Item>
                            <Item Icon={FileSearchIcon} onClick={handle_open_project}>Open Project</Item>
                            <Item
                                Icon={FileClockIcon}
                                disabled={recentProject.isLoading || !recentProject.data}
                                onClick={() => recentProject.data && handle_open_recent_project(recentProject.data)}
                            >
                                Open Recent
                                {recentProject.data && <span className="text-gray-400 font-normal">{path.parse(recentProject.data).base}</span>}
                            </Item>
                            <Item Icon={XIcon} onClick={handle_close_window}>Close</Item>
                        </div>
                    )
                }

                <span className="fixed bottom-0 text-[0.54rem] right-0 m-1 text-cyan-500 font-extralight">{displayName} v{version} - <a href={homepage} target="_blank">{author}</a></span>
            </div>
        </div>
    )
}

Welcome.getLayout = (page) => {
    return (
        <div className="h-full w-full">
            {page}
        </div>
    )
}

const fetch_is_ready = async () => {
    const result: Boolean = await invoke("check_requirements");

    return result;
}


const Item = ({ children, className, Icon, disabled, ...props }: React.ComponentPropsWithoutRef<"div"> & { Icon?: LucideIcon, disabled?: boolean }) => {
    return (
        <div className={clsx("flex gap-4 items-center px-6 text-sm font-medium  col-start-1 col-span-3 select-none h-16", "h-12 transition-colors duration-100 bg-gradient-to-r from-transparent", !disabled && "hover:backdrop-brightness-150 hover:to-black/30 hover:text-lime-400 cursor-pointer", disabled && " brightness-50 cursor-not-allowed", className)} {...props}>
            {Icon && <Icon className="w-5 h-5" />}{children}
        </div>
    )
}

const handle_create_project = async () => {
    const dialog = await import("@tauri-apps/api/dialog");

    const result = await dialog.save({
        filters: [{
            name: `${filetypeAssociation.name} Project`,
            extensions: filetypeAssociation.extensions
        }]
    })

    if (result) {
        await invoke("open_project", { path: result }).catch(err => {
            dialog.message(err, { type: "error", title: "Something went wrong" })
        })
    }
}

const handle_open_project = async () => {
    const dialog = await import("@tauri-apps/api/dialog");

    const result = await dialog.open({
        filters: [{
            name: `${filetypeAssociation.name} Project`,
            extensions: filetypeAssociation.extensions
        }]
    })

    if (result) {
        await invoke("open_project", { path: result }).catch(err => {
            dialog.message(err, { type: "error", title: "Something went wrong" })
        })
    }
}

const handle_open_recent_project = async (path: string) => {
    console.log(path)
    await invoke("open_project", { path }).catch(err => {
        import("@tauri-apps/api/dialog").then(dialog => dialog.message(err, { type: "error", title: "Something went wrong" }));
    })
};

const handle_close_window = async () => {
    const window = await import("@tauri-apps/api/window");

    const current = window.getCurrent();

    if (current) {
        current.close();
    }
}

export default Welcome
